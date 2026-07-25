import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const chat = await prisma.chatSession.findUnique({ where: { id: params.id } });
  if (!chat || chat.userId !== userId) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await prisma.chatSession.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
