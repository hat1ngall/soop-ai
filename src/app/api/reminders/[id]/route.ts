import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const result = await prisma.reminder.deleteMany({ where: { id: params.id, userId } });
  return result.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Напоминание не найдено" }, { status: 404 });
}
