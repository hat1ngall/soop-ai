import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAndResetExpiredSubscription, getDaysLeft } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const plan = await checkAndResetExpiredSubscription(userId);
  const daysLeft = await getDaysLeft(userId);

  return NextResponse.json({ plan, daysLeft });
}
