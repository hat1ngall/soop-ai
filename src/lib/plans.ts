export type PlanTier = "free" | "pro" | "boost" | "enterprise";

export const FREE_MODELS = ["gemini-flash-3.5", "minimax-2.5", "llama-4-scout"];

export const PRO_MODELS = ["claude-sonnet-4.6", "gpt-5.2", "gpt-5.4", "gpt-5.6-sol"];

export const BOOST_MODELS = ["claude-sonnet-5", "claude-opus-4.7", "claude-opus-4.8", "claude-opus-5", "claude-fable-5", "gemini-3.1-pro", "gpt-5.6-terra", "gpt-5.5"];

export const ENTERPRISE_MODELS = ["grok-4.3", "grok-4.5", "grok-build-0.1", "kimi-k2.6", "kimi-k2.7-code", "deepseek-v4-pro", "glm-5.2"];

export const DAILY_LIMITS: Record<PlanTier, number> = {
  free: 20,
  pro: 100,
  boost: 300,
  enterprise: -1,
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
      return [...FREE_MODELS, ...PRO_MODELS, ...BOOST_MODELS, ...ENTERPRISE_MODELS];
    default:
      return FREE_MODELS;
  }
}

export function isPremiumModel(modelId: string): boolean {
  return [...PRO_MODELS, ...BOOST_MODELS, ...ENTERPRISE_MODELS].includes(modelId);
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
