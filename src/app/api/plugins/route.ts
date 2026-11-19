import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPluginId } from "@/lib/plugins";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const enabled = await prisma.userPlugin.findMany({ where: { userId }, select: { pluginId: true } });
  return NextResponse.json({ enabled: enabled.map((plugin) => plugin.pluginId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  let body: { id?: unknown; enabled?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  if (typeof body.id !== "string" || !isPluginId(body.id) || typeof body.enabled !== "boolean") return NextResponse.json({ error: "Неизвестный плагин" }, { status: 400 });
  if (body.enabled) await prisma.userPlugin.upsert({ where: { userId_pluginId: { userId, pluginId: body.id } }, create: { userId, pluginId: body.id }, update: {} });
  else await prisma.userPlugin.deleteMany({ where: { userId, pluginId: body.id } });
  return NextResponse.json({ ok: true, id: body.id, enabled: body.enabled });
}
