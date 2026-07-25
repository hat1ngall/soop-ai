export type PlanTier = "free" | "pro" | "boost" | "enterprise";

// Модели по планам
export const FREE_MODELS = ["gemini-flash-3.5", "minimax-2.5", "claude-sonnet-4.6", "llama-4-scout"];

export const PRO_MODELS = ["gpt-5.6-sol", "gemini-3.1-pro"];

export const BOOST_MODELS = ["claude-fable-5", "claude-opus-5"];

export const ENTERPRISE_MODELS = ["claude-fable-5", "gpt-5.6-sol", "gemini-3.1-pro", "claude-opus-5"];

// Лимиты сообщений в день
export const DAILY_LIMITS: Record<PlanTier, number> = {
  free: 20,
  pro: 100,
  boost: 300,
  enterprise: -1, // безлимит
};

export function getAvailableModels(plan: PlanTier): string[] {
  switch (plan) {
    case "free":
      return FREE_MODELS;
    case "pro":
      return [...FREE_MODELS, ...PRO_MODELS];
    case "boost":
      return [...FREE_MODELS, ...PRO_MODELS, ...BOOST_MODELS];
    case "enterprise":
      return [...FREE_MODELS, ...ENTERPRISE_MODELS];
    default:
      return FREE_MODELS;
  }
}

export function isPremiumModel(modelId: string): boolean {
  return [...PRO_MODELS, ...BOOST_MODELS].includes(modelId);
}

export function isPremiumPlan(plan: PlanTier): boolean {
  return plan !== "free";
}

export function getPlanLabel(plan: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    free: "Free",
    pro: "Pro",
    boost: "Boost",
    enterprise: "Enterprise",
  };
  return labels[plan];
}

export function getDailyLimit(plan: PlanTier): number {
  return DAILY_LIMITS[plan];
}
