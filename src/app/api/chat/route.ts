import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableModels, getDailyLimit } from "@/lib/plans";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

const GROQ_MODEL_MAP: Record<string, string> = {
  "gemini-flash-3.5": "llama-3.3-70b-versatile",
  "minimax-2.5": "llama-3.3-70b-versatile",
  "llama-4-scout": "llama-3.3-70b-versatile",
  "claude-sonnet-4.6": "llama-3.3-70b-versatile",
  "gpt-5.2": "llama-3.3-70b-versatile",
  "gpt-5.4": "llama-3.3-70b-versatile",
  "gpt-5.6-sol": "llama-3.3-70b-versatile",
  "claude-sonnet-5": "llama-3.3-70b-versatile",
  "claude-opus-4.7": "llama-3.3-70b-versatile",
  "claude-opus-4.8": "llama-3.3-70b-versatile",
  "claude-opus-5": "llama-3.3-70b-versatile",
  "claude-fable-5": "llama-3.3-70b-versatile",
  "gemini-3.1-pro": "llama-3.3-70b-versatile",
  "gpt-5.6-terra": "llama-3.3-70b-versatile",
  "gpt-5.5": "llama-3.3-70b-versatile",
  "grok-4.3": "llama-3.3-70b-versatile",
  "grok-4.5": "llama-3.3-70b-versatile",
  "grok-build-0.1": "llama-3.3-70b-versatile",
  "kimi-k2.6": "llama-3.3-70b-versatile",
  "kimi-k2.7-code": "llama-3.3-70b-versatile",
  "deepseek-v4-pro": "llama-3.3-70b-versatile",
  "glm-5.2": "llama-3.3-70b-versatile",
};

function mapModelName(model: string): string {
  return GROQ_MODEL_MAP[model] || model;
}

// Скорость печати (мс на символ) — слабые быстрее, мощные медленнее
function getTypingSpeed(model: string): number {
  const speeds: Record<string, number> = {
    // Free — быстрые
    "gemini-flash-3.5": 20,
    "minimax-2.5": 22,
    "llama-4-scout": 21,
    "kimi-k2.6": 23,
    "kimi-k2.7-code": 23,
    "deepseek-v4-pro": 24,
    // Pro — средние
    "claude-sonnet-4.6": 35,
    "gpt-5.2": 33,
    "gpt-5.4": 36,
    "gpt-5.5": 38,
    "grok-4.3": 32,
    "grok-4.5": 37,
    // Boost — медленные (умные)
    "claude-sonnet-5": 45,
    "claude-opus-4.7": 48,
    "claude-opus-4.8": 50,
    "claude-opus-5": 55,
    "claude-fable-5": 52,
    "gemini-3.1-pro": 42,
    "gpt-5.6-sol": 47,
    "gpt-5.6-terra": 49,
    "glm-5.2": 44,
    // Enterprise
    "grok-build-0.1": 50,
  };
  return speeds[model] || 30;
}

// Скорость для кода — в 5 раз быстрее
function getCodeTypingSpeed(model: string): number {
  return Math.max(3, Math.floor(getTypingSpeed(model) / 5));
}

// Задержка "размышления" перед ответом (мс) — зависит от модели и длины
function getThinkingDelay(model: string, messageLength: number): number {
  const base: Record<string, number> = {
    // Free — быстро думает
    "gemini-flash-3.5": 1200,
    "minimax-2.5": 1500,
    "llama-4-scout": 1300,
    "kimi-k2.6": 1600,
    "kimi-k2.7-code": 1600,
    "deepseek-v4-pro": 1700,
    // Pro — среднее
    "claude-sonnet-4.6": 2500,
    "gpt-5.2": 2300,
    "gpt-5.4": 2700,
    "gpt-5.5": 2900,
    "grok-4.3": 2200,
    "grok-4.5": 2800,
    // Boost — долго думает (самый умный)
    "claude-sonnet-5": 3500,
    "claude-opus-4.7": 3800,
    "claude-opus-4.8": 4000,
    "claude-opus-5": 4500,
    "claude-fable-5": 4200,
    "gemini-3.1-pro": 3300,
    "gpt-5.6-sol": 3900,
    "gpt-5.6-terra": 4100,
    "glm-5.2": 3400,
    // Enterprise
    "grok-build-0.1": 4300,
  };
  const b = base[model] || 2500;
  // Чем длиннее сообщение — тем дольше думает (макс +5 сек)
  const lengthBonus = Math.min(messageLength * 10, 5000);
  return b + lengthBonus;
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

// Считаем задержку для символа
function charDelay(char: string, baseSpeed: number, inCode: boolean): number {
  if (inCode) return Math.max(1, Math.floor(baseSpeed / 6)); // Код — в 6 раз быстрее
  if (char === "\n") return baseSpeed * 4;
  if (".!?".includes(char)) return baseSpeed * 3;
  if (",;:".includes(char)) return baseSpeed * 2;
  if (char === " ") return baseSpeed * 1.5;
  return baseSpeed;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { message, model, sessionId } = await req.json();

  if (!message || !model || !sessionId) {
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
    data: { role: "user", content: message, sessionId },
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

  const typingSpeed = getTypingSpeed(model);
  const thinkingDelay = getThinkingDelay(model, message.length);

  // Стриминг
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      // 1. Задержка "размышления" перед стартом
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: true })}\n\n`));
      await new Promise((r) => setTimeout(r, thinkingDelay));

      if (!isApiConfigured) {
        // ДЕМО — побуквенно с задержками, код быстрее
        const demoText = getDemoResponse(message, model);
        let inCode = false;
        for (const char of demoText) {
          if (char === "`" && demoText.substr(fullContent.length, 3) === "```") inCode = !inCode;
          fullContent += char;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: char })}\n\n`));
          await new Promise((r) => setTimeout(r, charDelay(char, typingSpeed, inCode)));
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
              model: mapModelName(model),
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
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

          // 2. Выдаём посимвольно — код быстрее, текст медленнее
          let inCode = false;
          for (const char of fullText) {
            if (char === "\n" && fullText.substr(fullContent.length, 4) === "\n```") inCode = !inCode;
            fullContent += char;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: char })}\n\n`));
            await new Promise((r) => setTimeout(r, charDelay(char, typingSpeed, inCode)));
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
