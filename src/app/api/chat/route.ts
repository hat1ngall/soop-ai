import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableModels, getDailyLimit } from "@/lib/plans";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";
import { getSystemPrompt } from "@/lib/system-prompt";

function mapModelName(): string {
  return "gpt-6-luna";
}

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function describeUpstreamError(status: number, body: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message || parsed?.message || "";
  } catch {}
  detail = String(detail || "").trim().slice(0, 300);

  if (
    status === 402 ||
    (status === 429 && /card[-_ ]?required|insufficient|credit|balance/i.test(detail)) ||
    /check[- ]?in|insufficient|billing_error|payment|balance|card[-_ ]?required|credit/i.test(detail)
  ) {
    const suffix = detail ? ` Провайдер: "${detail}"` : "";
    return `API-аккаунт: недостаточно средств или ошибка баланса у провайдера.${suffix}`;
  }
  if (status === 401 || status === 403) {
    return detail || "Провайдер отклонил API-ключ. Проверьте MY_CUSTOM_API_KEY.";
  }
  if (status === 404) {
    return detail || "Модель не найдена на стороне провайдера.";
  }
  if (status === 429) {
    return detail || "Превышен лимит запросов провайдера. Попробуйте позже.";
  }
  if (detail) return detail;
  return `Провайдер вернул ошибку HTTP ${status}.`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { message, sessionId, attachments = [] } = await req.json();
  const model = mapModelName();

  if ((!message && (!attachments || attachments.length === 0)) || !sessionId) {
    return NextResponse.json({ error: "Отсутствуют обязательные поля" }, { status: 400 });
  }

  const todayStart = getTodayStart();

  const [currentPlan, chat, usage, history] = await Promise.all([
    checkAndResetExpiredSubscription(userId),
    prisma.chatSession.findUnique({ where: { id: sessionId } }),
    prisma.dailyUsage.findUnique({ where: { userId_date: { userId, date: todayStart } } }),
    prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 49,
    }),
  ]);

  if (!chat || chat.userId !== userId) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }

  const available = getAvailableModels(currentPlan);
  if (!available.includes(model)) {
    return NextResponse.json(
      { error: "upgrade_required", message: "Эта модель доступна только для Premium" },
      { status: 403 }
    );
  }

  const dailyLimit = getDailyLimit(currentPlan);
  if (dailyLimit !== -1 && (usage?.count || 0) >= dailyLimit) {
    return NextResponse.json(
      { error: "limit_exceeded", message: `Лимит исчерпан (${dailyLimit}/день)` },
      { status: 429 }
    );
  }

  const imageAttachments = Array.isArray(attachments)
    ? attachments.filter((a: any) => a?.dataUrl && typeof a.dataUrl === "string" && a?.type?.startsWith("image/"))
    : [];
  const textAttachments = Array.isArray(attachments)
    ? attachments.filter((a: any) => typeof a?.text === "string" && a.text.trim())
    : [];

  let fullUserContent = message ? String(message).trim() : "";
  if (imageAttachments.length > 0) {
    const imgs = imageAttachments.map((a: any) => `![${a.name || "image"}](${a.dataUrl})`).join("\n\n");
    fullUserContent = fullUserContent ? `${imgs}\n\n${fullUserContent}` : imgs;
  }
  if (textAttachments.length > 0) {
    const files = textAttachments.map((a: any) => `<<<FILE:${a.name || "файл"}>>>\n${a.text}\n<<<END_FILE>>>`).join("\n\n");
    fullUserContent = fullUserContent ? `${fullUserContent}\n\n${files}` : files;
  }

  // Сохранение сообщения пользователя запускаем без блокировки запроса к модели
  const saveUserMessagePromise = prisma.message.create({
    data: { role: "user", content: fullUserContent, sessionId },
  });

  const upstreamMessages: any[] = history.map((m) => {
    if (m.role === "assistant") {
      return { role: "assistant", content: m.content };
    }
    const contentForModel = m.content
      .replace(/<<<FILE:(.*?)>>>\n?([\s\S]*?)\n?<<<END_FILE>>>/g, "\n--- Файл: $1 ---\n$2\n--- Конец файла ---\n")
      .replace(/!\[(.*?)\]\(data:image\/[^)]+\)/g, "[Прикреплённое изображение: $1]");
    return { role: "user", content: contentForModel };
  });

  if (imageAttachments.length > 0) {
    const promptText = (message ? String(message).trim() : "") || "Проанализируй прикреплённые изображения и файлы.";
    let fullTextPart = promptText;
    if (textAttachments.length > 0) {
      fullTextPart += "\n\n" + textAttachments.map((a: any) => `--- Файл: ${a.name} ---\n${a.text}\n--- Конец файла ---`).join("\n\n");
    }

    const parts: any[] = [{ type: "text", text: fullTextPart }];
    for (const img of imageAttachments) {
      parts.push({
        type: "image_url",
        image_url: { url: img.dataUrl },
      });
    }
    upstreamMessages.push({ role: "user", content: parts });
  } else {
    upstreamMessages.push({ role: "user", content: fullUserContent });
  }

  const rawApiUrl = process.env.MY_CUSTOM_API_URL || "https://api.a6api.com/v1";
  const apiUrl = rawApiUrl.endsWith("/chat/completions")
    ? rawApiUrl
    : `${rawApiUrl.replace(/\/+$/, "")}/chat/completions`;
  const apiKey = process.env.MY_CUSTOM_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API-ключ модели не настроен" }, { status: 503 });
  }
  const upstreamController = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamController.abort(), 240_000);

  // Стриминг
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ thinking: true });

      try {
          const apiRes = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            signal: upstreamController.signal,
            body: JSON.stringify({
              model: mapModelName(),
              messages: [
                { role: "system", content: getSystemPrompt(model) },
                ...upstreamMessages,
              ],
              stream: true,
            }),
          });

          if (!apiRes.ok) {
            const err = await apiRes.text();
            console.error("Upstream API error:", apiRes.status, err);
            const detail = describeUpstreamError(apiRes.status, err);
            send({ error: detail });
            send({ done: true });
            controller.close();
            return;
          }

          if (apiRes.body) {
            const reader = apiRes.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              sseBuffer += decoder.decode(value, { stream: true });
              const lines = sseBuffer.split("\n");
              sseBuffer = lines.pop() ?? "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.error) {
                    const errMsg = typeof parsed.error === "string" ? parsed.error : parsed.error.message || "Ошибка API";
                    send({ error: errMsg });
                    send({ done: true });
                    controller.close();
                    return;
                  }
                  const chunk = parsed.choices?.[0]?.delta?.content;
                  if (chunk) {
                    fullContent += chunk;
                    send({ chunk });
                  }
                } catch {
                  // Игнорируем неполные JSON строки
                }
              }
            }

            if (sseBuffer.trim()) {
              const trimmed = sseBuffer.trim();
              if (trimmed.startsWith("data:")) {
                const dataStr = trimmed.slice(5).trim();
                if (dataStr !== "[DONE]") {
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunk = parsed.choices?.[0]?.delta?.content;
                    if (chunk) {
                      fullContent += chunk;
                      send({ chunk });
                    }
                  } catch {}
                }
              } else if (!fullContent) {
                // Если ответ пришёл обычным JSON (не SSE)
                try {
                  const parsed = JSON.parse(trimmed);
                  const text = parsed.choices?.[0]?.message?.content || parsed.response || parsed.content;
                  if (text) {
                    fullContent = text;
                    send({ chunk: text });
                  }
                } catch {}
              }
            }
          }

          if (!fullContent) {
            const fallback = "Пустой ответ от модели.";
            fullContent = fallback;
            send({ chunk: fallback });
          }
        } catch (error) {
          console.error("Chat API error:", error);
          const detail = upstreamController.signal.aborted
            ? "Провайдер не ответил за 240 секунд. Попробуйте ещё раз."
            : "Сервис недоступен: не удалось связаться с провайдером.";
          send({ error: detail });
          send({ done: true });
          controller.close();
          return;
        } finally {
          clearTimeout(upstreamTimeout);
        }

      // Дожидаемся сохранения сообщения пользователя
      await saveUserMessagePromise.catch((e) => console.error("Error saving user message:", e));

      // Сохраняем в БД ответ ассистента
      if (fullContent) {
        await prisma.message.create({
          data: { role: "assistant", content: fullContent, sessionId },
        });
      }

      await prisma.dailyUsage.upsert({
        where: { userId_date: { userId, date: todayStart } },
        update: { count: { increment: 1 } },
        create: { userId, date: todayStart, count: 1 },
      });

      if (history.length === 0) {
        const titleRaw = (message || imageAttachments[0]?.name || textAttachments[0]?.name || "Новый чат").trim();
        const shortTitle = titleRaw.slice(0, 50) + (titleRaw.length > 50 ? "..." : "");
        await prisma.chatSession.update({ where: { id: sessionId }, data: { title: shortTitle, model } });
      }

      const updatedUsage = await prisma.dailyUsage.findUnique({
        where: { userId_date: { userId, date: todayStart } },
      });

      send({ done: true, usage: { used: updatedUsage?.count || 0, limit: dailyLimit } });
      controller.close();
    },
    cancel() {
      upstreamController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
