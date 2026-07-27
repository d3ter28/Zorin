export const PLAN_TIERS = ["starter", "growth", "scale"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export function isValidPlanTier(value: string): value is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(value);
}

const ENV_VAR_BY_TIER: Record<PlanTier, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  scale: "STRIPE_PRICE_SCALE",
};

/** Resolve a plan tier to its Stripe Price ID. Throws if the env var isn't set. */
export function priceIdForTier(tier: PlanTier): string {
  const envVar = ENV_VAR_BY_TIER[tier];
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`Missing required env var ${envVar} for plan tier "${tier}"`);
  }
  return priceId;
}
