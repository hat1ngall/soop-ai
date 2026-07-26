import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanTier } from "@/lib/plans";

// Промокоды — просто валидные коды, план берётся из выбора пользователя
const VALID_PROMOCODES = ["soopcool"];

const VALID_PLANS: PlanTier[] = ["pro", "boost", "enterprise"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { code, selectedPlan } = await req.json();

    if (!code || !selectedPlan) {
      return NextResponse.json({ error: "Введите код и выберите план" }, { status: 400 });
    }

    // Валидация промокода
    const isValid = VALID_PROMOCODES.includes(code.toLowerCase().trim());
    if (!isValid) {
      return NextResponse.json({ error: "Неверный код активации" }, { status: 400 });
    }

    // Валидация плана
    if (!VALID_PLANS.includes(selectedPlan as PlanTier)) {
      return NextResponse.json({ error: "Неизвестный план" }, { status: 400 });
    }

    // Активируем выбранный план
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: selectedPlan,
        subscriptionExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      plan: selectedPlan,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Activation failed", error);
    return NextResponse.json(
      { error: "Не удалось активировать подписку. Проверьте базу данных на Render." },
      { status: 500 }
    );
  }
}
