import { prisma } from "./prisma";
import { PlanTier } from "./plans";

export async function checkAndResetExpiredSubscription(userId: string): Promise<PlanTier> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return "free";

  if (user.plan !== "free" && user.subscriptionExpiresAt) {
    const now = new Date();
    if (now > user.subscriptionExpiresAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "free", subscriptionExpiresAt: null },
      });
      return "free";
    }
  }

  return user.plan as PlanTier;
}

export async function getDaysLeft(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.plan === "free" || !user.subscriptionExpiresAt) return null;

  const now = new Date();
  const diff = user.subscriptionExpiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
