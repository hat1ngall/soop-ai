import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableModels, getDailyLimit } from "@/lib/plans";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";
import { getSystemPrompt } from "@/lib/system-prompt";

function mapModelName(): string {
  return "gpt-5.4-mini";
}

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDemoResponse(message: string, model: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("привет") || lower.includes("hello") || lower.includes("hi")) {
    return `Привет! Я Soop AI, модель **${model}**. Чем могу помочь сегодня?`;
  }
  if (lower.includes("кто ты") || lower.includes("что ты") || lower.includes("who are you")) {
    return `Я — **Soop AI**, AI-ассистент, созданный командой Soop AI.\n\nСейчас я работаю в демо-режиме, так как API ключ ещё не настроен. Как только настроите \`MY_CUSTOM_API_URL\` и \`MY_CUSTOM_API_KEY\` в файле \`.env\`, я начну отвечать через реальную модель.\n\nПока можете тестировать интерфейс!`;
  }
  if (lower.includes("помощь") || lower.includes("help") || lower.includes("что умеешь")) {
    return `Я могу помочь с:\n\n- **Кодом** — написание, отладка, рефакторинг\n- **Текстами** — генерация, редактирование, перевод\n- **Анализом** — данные, документы, задачи\n- **Вопросами** — знания, объяснения, рекомендации\n\nНапишите что-нибудь, и я отвечу!`;
  }
  if (lower.includes("код") || lower.includes("code") || lower.includes("пример")) {
    return `Вот пример простой функции на Python:\n\n\`\`\`python\ndef fibonacci(n: int) -> list[int]:\n    if n <= 0:\n        return []\n    if n == 1:\n        return [0]\n    fib = [0, 1]\n    for _ in range(2, n):\n        fib.append(fib[-1] + fib[-2])\n    return fib\n\nprint(fibonacci(10))\n# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n\`\`\``;
  }
  return `Это демо-ответ от **Soop AI** (модель: ${model}).\n\nВаше сообщение: "${message}"\n\nНастройте \`MY_CUSTOM_API_URL\` и \`MY_CUSTOM_API_KEY\` в \`.env\` для реальных ответов.`;
}

// Короткая постоянная пауза сохраняет печать по буквам без искусственных задержек.
function charDelay(): number {
  return 5;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { message, model, sessionId, attachments = [] } = await req.json();

  if ((!message && !attachments.length) || !model || !sessionId) {
    return NextResponse.json({ error: "Отсутствуют обязательные поля" }, { status: 400 });
  }

  const currentPlan = await checkAndResetExpiredSubscription(userId);

  const available = getAvailableModels(currentPlan);
  if (!available.includes(model)) {
    return NextResponse.json(
      { error: "upgrade_required", message: "Эта модель доступна только для Premium" },
      { status: 403 }
    );
  }

  const dailyLimit = getDailyLimit(currentPlan);
  if (dailyLimit !== -1) {
    const todayStart = getTodayStart();
    const usage = await prisma.dailyUsage.findUnique({
      where: { userId_date: { userId, date: todayStart } },
    });
    if ((usage?.count || 0) >= dailyLimit) {
      return NextResponse.json(
        { error: "limit_exceeded", message: `Лимит исчерпан (${dailyLimit}/день)` },
        { status: 429 }
      );
    }
  }

  const chat = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!chat || chat.userId !== userId) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }

  await prisma.message.create({
    data: { role: "user", content: attachments.length ? `${message}\n\n[Attachments: ${attachments.map((a: any) => a.name).join(", ")}]` : message, sessionId },
  });

  const history = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const apiUrl = process.env.MY_CUSTOM_API_URL;
  const apiKey = process.env.MY_CUSTOM_API_KEY;
  const isApiConfigured =
    apiUrl && apiKey &&
    !apiUrl.includes("your-api-endpoint") &&
    !apiKey.includes("your-api-key");

  // Стриминг
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: true })}\n\n`));

      if (!isApiConfigured) {
        // ДЕМО — быстрый вывод по одному символу.
        const demoText = getDemoResponse(message, model);
        for (const char of demoText) {
          fullContent += char;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: char })}\n\n`));
          await new Promise((r) => setTimeout(r, charDelay()));
        }
      } else {
        // Реальный API — сначала получаем полный ответ
        try {
          const apiRes = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: mapModelName(),
              messages: [
                { role: "system", content: getSystemPrompt(model) },
                ...history.map((m) => ({ role: m.role, content: m.content })),
              ],
            }),
          });

          if (!apiRes.ok) {
            const err = await apiRes.text();
            console.error("Upstream API error:", err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Ошибка модели" })}\n\n`));
            controller.close();
            return;
          }

          const data = await apiRes.json();
          const fullText =
            data.choices?.[0]?.message?.content ||
            data.response ||
            data.content ||
            "Пустой ответ от модели.";

          // Выдаём ответ посимвольно.
          for (const char of fullText) {
            fullContent += char;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: char })}\n\n`));
            await new Promise((r) => setTimeout(r, charDelay()));
          }
        } catch (error) {
          console.error("Chat API error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Сервис недоступен" })}\n\n`));
        }
      }

      // Сохраняем в БД
      await prisma.message.create({
        data: { role: "assistant", content: fullContent, sessionId },
      });

      const todayStart = getTodayStart();
      await prisma.dailyUsage.upsert({
        where: { userId_date: { userId, date: todayStart } },
        update: { count: { increment: 1 } },
        create: { userId, date: todayStart, count: 1 },
      });

      if (history.length <= 1) {
        const shortTitle = message.slice(0, 50) + (message.length > 50 ? "..." : "");
        await prisma.chatSession.update({ where: { id: sessionId }, data: { title: shortTitle, model } });
      }

      const updatedUsage = await prisma.dailyUsage.findUnique({
        where: { userId_date: { userId, date: todayStart } },
      });

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, usage: { used: updatedUsage?.count || 0, limit: dailyLimit } })}\n\n`));
      controller.close();
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
