import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableModels, getDailyLimit } from "@/lib/plans";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";
import { getSystemPrompt } from "@/lib/system-prompt";
import { parseGeneratedImage } from "@/lib/generated-images";
import { ChatProviderError, streamChatCompletion } from "@/lib/chat-provider";

function mapModelName(): string {
  return "gpt-6-luna";
}

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

  const upstreamMessages: any[] = history.map((m) => {
    if (m.role === "assistant") {
      const image = parseGeneratedImage(m.content);
      return { role: "assistant", content: image ? `[Создано изображение по описанию: ${image.prompt}]` : m.content };
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
    return NextResponse.json({ error: "Сервис ответов временно недоступен. Попробуйте позже." }, { status: 503 });
  }
  // Persist once for the whole request; upstream retries never create messages.
  try {
    await prisma.message.create({ data: { role: "user", content: fullUserContent, sessionId } });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить сообщение. Попробуйте ещё раз." }, { status: 500 });
  }

  const upstreamController = new AbortController();
  let cancelled = req.signal.aborted;
  let responseCancelled = false;
  let timedOut = false;
  const cancel = () => { cancelled = true; upstreamController.abort(); };
  req.signal.addEventListener("abort", cancel, { once: true });
  if (cancelled) upstreamController.abort();
  const upstreamTimeout = setTimeout(() => {
    timedOut = true;
    upstreamController.abort();
  }, 240_000);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        send({ thinking: true });
        const fullContent = await streamChatCompletion({
          url: apiUrl, apiKey, model,
          messages: [{ role: "system", content: getSystemPrompt(model) }, ...upstreamMessages],
          signal: upstreamController.signal,
          onChunk: (chunk) => send({ chunk }),
          onRetry: (attempt, error) => {
            console.warn("Chat upstream retry", { attempt, code: error.code, status: error.status, requestId: error.requestId });
            send({ thinking: true });
          },
        });
        if (cancelled || upstreamController.signal.aborted) return;

        // A provider failure, empty or truncated stream cannot save an answer or spend the daily quota.
        const updatedUsage = await prisma.$transaction(async (tx) => {
          await tx.message.create({ data: { role: "assistant", content: fullContent, sessionId } });
          const updated = await tx.dailyUsage.upsert({
            where: { userId_date: { userId, date: todayStart } },
            update: { count: { increment: 1 } },
            create: { userId, date: todayStart, count: 1 },
          });
          if (history.length === 0) {
            const titleRaw = (message || imageAttachments[0]?.name || textAttachments[0]?.name || "Новый чат").trim();
            const shortTitle = titleRaw.slice(0, 50) + (titleRaw.length > 50 ? "..." : "");
            await tx.chatSession.update({ where: { id: sessionId }, data: { title: shortTitle, model } });
          }
          return updated;
        });
        send({ done: true, usage: { used: updatedUsage.count, limit: dailyLimit } });
      } catch (error) {
        if (!cancelled) {
          const providerError = error instanceof ChatProviderError ? error : null;
          console.error("Chat request failed", { code: providerError?.code || "internal", status: providerError?.status, requestId: providerError?.requestId });
          const detail = timedOut
            ? "Не удалось дождаться ответа. Попробуйте ещё раз."
            : providerError?.message || "Не удалось получить ответ. Попробуйте ещё раз.";
          send({ error: detail });
          send({ done: true });
        }
      } finally {
        clearTimeout(upstreamTimeout);
        req.signal.removeEventListener("abort", cancel);
        upstreamController.abort();
        if (!responseCancelled) controller.close();
      }
    },
    cancel() {
      responseCancelled = true;
      cancel();
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
