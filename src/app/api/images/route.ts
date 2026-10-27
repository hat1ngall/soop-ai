import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDailyLimit } from "@/lib/plans";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";
import { generateImage, IMAGE_SIZES, ImageGenerationError, ImageSize, readLimitedBody } from "@/lib/image-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

const generatingUsers = new Set<string>();

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse((await readLimitedBody(req.body, 32 * 1024)).toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const input = payload as Record<string, unknown> | null;
  const prompt = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  const sessionId = typeof input?.sessionId === "string" ? input.sessionId : "";
  const size = input?.size ?? "1024x1024";
  if (!prompt || prompt.length > 4000 || !sessionId || sessionId.length > 128 ||
    typeof size !== "string" || !(IMAGE_SIZES as readonly string[]).includes(size)) {
    return NextResponse.json({ error: "Укажите описание до 4000 символов и допустимый размер изображения" }, { status: 400 });
  }
  if (generatingUsers.has(userId)) {
    return NextResponse.json({ error: "generation_in_progress", message: "Дождитесь завершения текущего изображения" }, { status: 409 });
  }

  const requestedAt = new Date();
  generatingUsers.add(userId);
  const todayStart = getTodayStart();
  const controller = new AbortController();
  const abort = () => controller.abort();
  req.signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 240_000);
  let reserved = false;
  try {
    const chat = await prisma.chatSession.findFirst({ where: { id: sessionId, userId }, select: { id: true, title: true } });
    if (!chat) return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
    const plan = await checkAndResetExpiredSubscription(userId);
    const dailyLimit = getDailyLimit(plan) ?? getDailyLimit("free");

    // The conditional increment is atomic in Postgres. Multiple workers cannot
    // reserve the same remaining quota unit for image generation.
    await prisma.dailyUsage.upsert({
      where: { userId_date: { userId, date: todayStart } },
      update: {}, create: { userId, date: todayStart, count: 0 },
    });
    const reservation = await prisma.dailyUsage.updateMany({
      where: { userId, date: todayStart, ...(dailyLimit === -1 ? {} : { count: { lt: dailyLimit } }) },
      data: { count: { increment: 1 } },
    });
    if (!reservation.count) {
      return NextResponse.json({ error: "limit_exceeded", message: `Лимит исчерпан (${dailyLimit}/день)` }, { status: 429 });
    }
    reserved = true;
    if (req.signal.aborted) controller.abort();
    const image = await generateImage(prompt, size as ImageSize, controller.signal);
    const imageId = randomUUID();
    const content = JSON.stringify({ type: "generated_image", imageId, prompt, size });
    const result = await prisma.$transaction(async (tx) => {
      // Confirm ownership again: the chat may have been deleted while waiting.
      const ownedChat = await tx.chatSession.findFirst({ where: { id: sessionId, userId }, select: { title: true } });
      if (!ownedChat) throw new ImageGenerationError(404, "Чат не найден");
      const userMessage = await tx.message.create({
        data: { role: "user", content: `Создай изображение: ${prompt}`, sessionId, createdAt: requestedAt },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      const assistantMessage = await tx.message.create({
        data: {
          role: "assistant", content, sessionId, createdAt: new Date(Math.max(Date.now(), userMessage.createdAt.getTime() + 1)),
          image: { create: { id: imageId, data: image.data, mimeType: image.mimeType } },
        },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      await tx.chatSession.update({
        where: { id: sessionId },
        data: { ...(["Новый чат", "New chat"].includes(ownedChat.title) ? { title: prompt.slice(0, 50) } : {}), updatedAt: new Date() },
      });
      const usage = await tx.dailyUsage.findUnique({ where: { userId_date: { userId, date: todayStart } }, select: { count: true } });
      return { userMessage, assistantMessage, usage: { used: usage?.count ?? 1, limit: dailyLimit } };
    });
    reserved = false;
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Не удалось сохранить изображение. Попробуйте ещё раз позже." }, { status: 500 });
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener("abort", abort);
    if (reserved) {
      // Failed requests do not consume the user's daily allowance.
      await prisma.dailyUsage.updateMany({
        where: { userId, date: todayStart, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      }).catch(() => console.error("Image request quota refund failed"));
    }
    generatingUsers.delete(userId);
  }
}
