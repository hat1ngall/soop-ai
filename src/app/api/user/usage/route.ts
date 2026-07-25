import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDailyLimit } from "@/lib/plans";
import { checkAndResetExpiredSubscription } from "@/lib/subscription";

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const plan = await checkAndResetExpiredSubscription(userId);
  const dailyLimit = getDailyLimit(plan);

  const todayStart = getTodayStart();
  const usage = await prisma.dailyUsage.findUnique({
    where: {
      userId_date: { userId, date: todayStart },
    },
  });

  const used = usage?.count || 0;

  return NextResponse.json({
    plan,
    used,
    limit: dailyLimit,
    remaining: dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - used),
  });
}
