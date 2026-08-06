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
  if (lower.includes("РїСЂРёРІРµС‚") || lower.includes("hello") || lower.includes("hi")) {
    return `РџСЂРёРІРµС‚! РЇ Soop AI, РјРѕРґРµР»СЊ **${model}**. Р§РµРј РјРѕРіСѓ РїРѕРјРѕС‡СЊ СЃРµРіРѕРґРЅСЏ?`;
  }
  if (lower.includes("РєС‚Рѕ С‚С‹") || lower.includes("С‡С‚Рѕ С‚С‹") || lower.includes("who are you")) {
    return `РЇ вЂ” **Soop AI**, AI-Р°СЃСЃРёСЃС‚РµРЅС‚, СЃРѕР·РґР°РЅРЅС‹Р№ РєРѕРјР°РЅРґРѕР№ Soop AI.\n\nРЎРµР№С‡Р°СЃ СЏ СЂР°Р±РѕС‚Р°СЋ РІ РґРµРјРѕ-СЂРµР¶РёРјРµ, С‚Р°Рє РєР°Рє API РєР»СЋС‡ РµС‰С‘ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ. РљР°Рє С‚РѕР»СЊРєРѕ РЅР°СЃС‚СЂРѕРёС‚Рµ \`MY_CUSTOM_API_URL\` Рё \`MY_CUSTOM_API_KEY\` РІ С„Р°Р№Р»Рµ \`.env\`, СЏ РЅР°С‡РЅСѓ РѕС‚РІРµС‡Р°С‚СЊ С‡РµСЂРµР· СЂРµР°Р»СЊРЅСѓСЋ РјРѕРґРµР»СЊ.\n\nРџРѕРєР° РјРѕР¶РµС‚Рµ С‚РµСЃС‚РёСЂРѕРІР°С‚СЊ РёРЅС‚РµСЂС„РµР№СЃ!`;
  }
  if (lower.includes("РїРѕРјРѕС‰СЊ") || lower.includes("help") || lower.includes("С‡С‚Рѕ СѓРјРµРµС€СЊ")) {
    return `РЇ РјРѕРіСѓ РїРѕРјРѕС‡СЊ СЃ:\n\n- **РљРѕРґРѕРј** вЂ” РЅР°РїРёСЃР°РЅРёРµ, РѕС‚Р»Р°РґРєР°, СЂРµС„Р°РєС‚РѕСЂРёРЅРі\n- **РўРµРєСЃС‚Р°РјРё** вЂ” РіРµРЅРµСЂР°С†РёСЏ, СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ, РїРµСЂРµРІРѕРґ\n- **РђРЅР°Р»РёР·РѕРј** вЂ” РґР°РЅРЅС‹Рµ, РґРѕРєСѓРјРµРЅС‚С‹, Р·Р°РґР°С‡Рё\n- **Р’РѕРїСЂРѕСЃР°РјРё** вЂ” Р·РЅР°РЅРёСЏ, РѕР±СЉСЏСЃРЅРµРЅРёСЏ, СЂРµРєРѕРјРµРЅРґР°С†РёРё\n\nРќР°РїРёС€РёС‚Рµ С‡С‚Рѕ-РЅРёР±СѓРґСЊ, Рё СЏ РѕС‚РІРµС‡Сѓ!`;
  }
  if (lower.includes("РєРѕРґ") || lower.includes("code") || lower.includes("РїСЂРёРјРµСЂ")) {
    return `Р’РѕС‚ РїСЂРёРјРµСЂ РїСЂРѕСЃС‚РѕР№ С„СѓРЅРєС†РёРё РЅР° Python:\n\n\`\`\`python\ndef fibonacci(n: int) -> list[int]:\n    if n <= 0:\n        return []\n    if n == 1:\n        return [0]\n    fib = [0, 1]\n    for _ in range(2, n):\n        fib.append(fib[-1] + fib[-2])\n    return fib\n\nprint(fibonacci(10))\n# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n\`\`\``;
  }
  return `Р­С‚Рѕ РґРµРјРѕ-РѕС‚РІРµС‚ РѕС‚ **Soop AI** (РјРѕРґРµР»СЊ: ${model}).\n\nР’Р°С€Рµ СЃРѕРѕР±С‰РµРЅРёРµ: "${message}"\n\nРќР°СЃС‚СЂРѕР№С‚Рµ \`MY_CUSTOM_API_URL\` Рё \`MY_CUSTOM_API_KEY\` РІ \`.env\` РґР»СЏ СЂРµР°Р»СЊРЅС‹С… РѕС‚РІРµС‚РѕРІ.`;
}

// РљРѕСЂРѕС‚РєР°СЏ РїРѕСЃС‚РѕСЏРЅРЅР°СЏ РїР°СѓР·Р° СЃРѕС…СЂР°РЅСЏРµС‚ РїРµС‡Р°С‚СЊ РїРѕ Р±СѓРєРІР°Рј Р±РµР· РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹С… Р·Р°РґРµСЂР¶РµРє.
function charDelay(): number {
  return 5;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { message, model, sessionId } = await req.json();

  if (!message || !model || !sessionId) {
    return NextResponse.json({ error: "РћС‚СЃСѓС‚СЃС‚РІСѓСЋС‚ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ" }, { status: 400 });
  }

  const currentPlan = await checkAndResetExpiredSubscription(userId);

  const available = getAvailableModels(currentPlan);
  if (!available.includes(model)) {
    return NextResponse.json(
      { error: "upgrade_required", message: "Р­С‚Р° РјРѕРґРµР»СЊ РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ РґР»СЏ Premium" },
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
        { error: "limit_exceeded", message: `Р›РёРјРёС‚ РёСЃС‡РµСЂРїР°РЅ (${dailyLimit}/РґРµРЅСЊ)` },
        { status: 429 }
      );
    }
  }

  const chat = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!chat || chat.userId !== userId) {
    return NextResponse.json({ error: "РЎРµСЃСЃРёСЏ РЅРµ РЅР°Р№РґРµРЅР°" }, { status: 404 });
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
  const upstreamController = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamController.abort(), 240_000);
  const isApiConfigured =
    apiUrl && apiKey &&
    !apiUrl.includes("your-api-endpoint") &&
    !apiKey.includes("your-api-key");

  // РЎС‚СЂРёРјРёРЅРі
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: true })}\n\n`));

      if (!isApiConfigured) {
        // Р”Р•РњРћ вЂ” Р±С‹СЃС‚СЂС‹Р№ РІС‹РІРѕРґ РїРѕ РѕРґРЅРѕРјСѓ СЃРёРјРІРѕР»Сѓ.
        const demoText = getDemoResponse(message, model);
        for (const char of demoText) {
          fullContent += char;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: char })}\n\n`));
          await new Promise((r) => setTimeout(r, charDelay()));
        }
      } else {
        // Р РµР°Р»СЊРЅС‹Р№ API вЂ” СЃРЅР°С‡Р°Р»Р° РїРѕР»СѓС‡Р°РµРј РїРѕР»РЅС‹Р№ РѕС‚РІРµС‚
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
                ...history.map((m) => ({ role: m.role, content: m.content })),
              ],
            }),
          });

          if (!apiRes.ok) {
            const err = await apiRes.text();
            console.error("Upstream API error:", err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "РћС€РёР±РєР° РјРѕРґРµР»Рё" })}\n\n`));
            controller.close();
            return;
          }

          const data = await apiRes.json();
          clearTimeout(upstreamTimeout);
          const fullText =
            data.choices?.[0]?.message?.content ||
            data.response ||
            data.content ||
            "РџСѓСЃС‚РѕР№ РѕС‚РІРµС‚ РѕС‚ РјРѕРґРµР»Рё.";

          // Р’С‹РґР°С‘Рј РѕС‚РІРµС‚ РїРѕСЃРёРјРІРѕР»СЊРЅРѕ.
          for (const char of fullText) {
            fullContent += char;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: char })}\n\n`));
            await new Promise((r) => setTimeout(r, charDelay()));
          }
        } catch (error) {
          clearTimeout(upstreamTimeout);
          console.error("Chat API error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "РЎРµСЂРІРёСЃ РЅРµРґРѕСЃС‚СѓРїРµРЅ" })}\n\n`));
        }
      }

      // РЎРѕС…СЂР°РЅСЏРµРј РІ Р‘Р”
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
