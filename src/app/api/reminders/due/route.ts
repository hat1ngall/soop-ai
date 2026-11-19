import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const now = new Date();
  const due = await prisma.reminder.findMany({ where: { userId, deliveredAt: null, remindAt: { lte: now } }, orderBy: { remindAt: "asc" }, take: 10 });
  const claimed = [];
  for (const reminder of due) {
    const result = await prisma.reminder.updateMany({ where: { id: reminder.id, userId, deliveredAt: null }, data: { deliveredAt: now } });
    if (result.count) claimed.push({ id: reminder.id, message: reminder.message, remindAt: reminder.remindAt });
  }
  return NextResponse.json(claimed, { headers: { "Cache-Control": "no-store" } });
}
