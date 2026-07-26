export type PlanTier = "free" | "pro" | "boost" | "enterprise";

// Free — слабые модели (rank 20+)
export const FREE_MODELS = [
  "gemini-flash-3.5", "minimax-2.5", "llama-4-scout",
  "kimi-k2.6", "kimi-k2.7-code", "deepseek-v4-pro",
];

// Pro — средние модели (rank 11-20)
export const PRO_MODELS = [
  "claude-sonnet-4.6", "gpt-5.2", "gpt-5.4", "gpt-5.5",
  "grok-4.3", "grok-4.5",
];

// Boost — топовые модели (rank 1-10)
export const BOOST_MODELS = [
  "claude-sonnet-5", "claude-opus-4.7", "claude-opus-4.8",
  "claude-opus-5", "claude-fable-5", "gemini-3.1-pro",
  "gpt-5.6-sol", "gpt-5.6-terra", "glm-5.2",
];

// Enterprise — всё + эксклюзив
export const ENTERPRISE_MODELS = [
  "grok-build-0.1",
];

export const DAILY_LIMITS: Record<PlanTier, number> = {
  free: 20,
  pro: 100,
  boost: 300,
  enterprise: -1,
};

export function getAvailableModels(plan: PlanTier): string[] {
  switch (plan) {
    case "free": return FREE_MODELS;
    case "pro": return [...FREE_MODELS, ...PRO_MODELS];
    case "boost": return [...FREE_MODELS, ...PRO_MODELS, ...BOOST_MODELS];
    case "enterprise": return [...FREE_MODELS, ...PRO_MODELS, ...BOOST_MODELS, ...ENTERPRISE_MODELS];
    default: return FREE_MODELS;
  }
}

export function isPremiumModel(modelId: string): boolean {
  return [...PRO_MODELS, ...BOOST_MODELS, ...ENTERPRISE_MODELS].includes(modelId);
}

export function isPremiumPlan(plan: PlanTier): boolean {
  return plan !== "free";
}

export function getPlanLabel(plan: PlanTier): string {
  return { free: "Free", pro: "Pro", boost: "Boost", enterprise: "Enterprise" }[plan];
}

export function getDailyLimit(plan: PlanTier): number {
  return DAILY_LIMITS[plan];
}
