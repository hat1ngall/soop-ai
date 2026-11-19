import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";
import { getDailyLimit } from "@/lib/plans";
import { streamChatCompletion } from "@/lib/chat-provider";

export const runtime = "nodejs";

async function userId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const reminders = await prisma.reminder.findMany({
    where: { userId: id }, orderBy: { remindAt: "asc" }, take: 200,
    select: { id: true, subject: true, remindAt: true, deliveredAt: true, message: true },
  });
  return NextResponse.json(reminders.map(({ message, ...reminder }) => ({ ...reminder, message: reminder.deliveredAt ? message : null })), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  let body: { subject?: unknown; remindAt?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const remindAt = typeof body.remindAt === "string" ? new Date(body.remindAt) : new Date(NaN);
  if (!subject || subject.length > 500 || !Number.isFinite(remindAt.getTime()) || remindAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Укажите текст до 500 символов и будущее время." }, { status: 400 });
  }
  if (!process.env.MY_CUSTOM_API_KEY?.trim()) return NextResponse.json({ error: "Сервис нейросети временно недоступен." }, { status: 503 });
  const plan = await checkAndResetExpiredSubscription(id);
  const limit = getDailyLimit(plan);
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  await prisma.dailyUsage.upsert({ where: { userId_date: { userId: id, date } }, update: {}, create: { userId: id, date, count: 0 } });
  const reserved = await prisma.dailyUsage.updateMany({ where: { userId: id, date, ...(limit === -1 ? {} : { count: { lt: limit } }) }, data: { count: { increment: 1 } } });
  if (!reserved.count) return NextResponse.json({ error: "Дневной лимит запросов исчерпан. Оформите подписку для безлимитного доступа." }, { status: 429 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const root = process.env.MY_CUSTOM_API_URL || "https://api.a6api.com/v1";
    const url = root.endsWith("/chat/completions") ? root : `${root.replace(/\/+$/, "")}/chat/completions`;
    const message = await streamChatCompletion({
      url, apiKey: process.env.MY_CUSTOM_API_KEY!.trim(), model: process.env.DEFAULT_AI_MODEL?.trim() || "gpt-6-luna",
      messages: [
        { role: "system", content: "Сформулируй короткое дружелюбное напоминание по тексту пользователя. Сохрани смысл, не добавляй фактов. Одно предложение, без кавычек. Ответ на языке пользователя." },
        { role: "user", content: subject },
      ],
      signal: controller.signal, onChunk: () => {}, maxAttempts: 1, maxTokens: 100,
    });
    if (remindAt.getTime() <= Date.now()) throw new Error("Указанное время уже наступило. Выберите новое время.");
    const reminder = await prisma.reminder.create({ data: { userId: id, subject, message: message.trim().slice(0, 500), remindAt }, select: { id: true, subject: true, remindAt: true, deliveredAt: true } });
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    await prisma.dailyUsage.updateMany({ where: { userId: id, date, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
    return NextResponse.json({ error: error instanceof Error && error.message.startsWith("Указанное время") ? error.message : "Не удалось создать напоминание. Попробуйте ещё раз." }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
