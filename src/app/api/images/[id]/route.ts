import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!params.id || params.id.length > 128) return NextResponse.json({ error: "Изображение не найдено" }, { status: 404 });
  try {
    const image = await prisma.generatedImage.findFirst({
      where: { id: params.id, message: { session: { userId } } },
      select: { data: true, mimeType: true },
    });
    if (!image) return NextResponse.json({ error: "Изображение не найдено" }, { status: 404 });
    const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
    const extension = extensions[image.mimeType];
    if (!extension) return NextResponse.json({ error: "Изображение недоступно" }, { status: 404 });
    const disposition = new URL(req.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(image.data.length),
        "Content-Disposition": `${disposition}; filename="image.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить изображение. Попробуйте ещё раз позже." }, { status: 500 });
  }
}
