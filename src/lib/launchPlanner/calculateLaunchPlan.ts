export type LaunchPositioning = "budget" | "mid-market" | "premium";
export type LaunchRoundingMode = "whole" | "ninety-nine";
export type LaunchPlanConfidence = "low" | "medium";

export interface CalculateLaunchPlanInput {
  unitCostCents: number;
  shippingCents: number;
  packagingCents: number;
  otherUnitCostsCents: number;
  paymentFeePct: number;
  platformFeePct: number;
  requiredMarginPct: number;
  positioning: LaunchPositioning;
  competitorPricesCents?: number[];
  roundingMode?: LaunchRoundingMode;
}

export interface LaunchMarketStats {
  minCents: number;
  maxCents: number;
  medianCents: number;
  q1Cents: number;
  q3Cents: number;
}

export type CalculateLaunchPlanResult =
  | {
      ok: true;
      minimumViablePriceCents: number;
      recommendedPriceCents: number;
      stretchPriceCents: number;
      discountFloorPriceCents: number;
      feePct: number;
      grossMarginPct: number;
      confidence: LaunchPlanConfidence;
      warnings: string[];
      explanation: string;
      marketStats: LaunchMarketStats | null;
    }
  | {
      ok: false;
      error: string;
      warnings: string[];
    };

const COST_ONLY_MARKUPS: Record<LaunchPositioning, number> = {
  budget: 1.10,
  "mid-market": 1.25,
  premium: 1.45,
};

export function calculateLaunchPlan(input: CalculateLaunchPlanInput): CalculateLaunchPlanResult {
  const totalRate = input.requiredMarginPct + input.paymentFeePct + input.platformFeePct;

  if (totalRate >= 0.95) {
    return {
      ok: false,
      error: "Required margin and fee percentages leave too little pricing room.",
      warnings: [],
    };
  }

  const totalCostCents =
    input.unitCostCents +
    input.shippingCents +
    input.packagingCents +
    input.otherUnitCostsCents;
  const feePct = input.paymentFeePct + input.platformFeePct;
  const minimumViablePriceCents = Math.ceil(totalCostCents / (1 - totalRate));
  const marketPrices = sanitizePrices(input.competitorPricesCents ?? []);
  const marketStats = marketPrices.length > 0 ? calculateMarketStats(marketPrices) : null;
  const warnings: string[] = [];

  const targetPriceCents = marketStats
    ? marketTargetForPositioning(marketStats, input.positioning)
    : minimumViablePriceCents * COST_ONLY_MARKUPS[input.positioning];

  if (marketStats && targetPriceCents < minimumViablePriceCents) {
    warnings.push("Market prices sit below the margin floor; recommendation was lifted to protect margin.");
  }

  const floorSafeTargetCents = Math.max(targetPriceCents, minimumViablePriceCents);
  const recommendedPriceCents = roundPriceUp(
    floorSafeTargetCents,
    minimumViablePriceCents,
    input.roundingMode ?? "ninety-nine"
  );
  const stretchPriceCents = roundPriceUp(
    marketStats
      ? Math.max(recommendedPriceCents * 1.12, marketStats.maxCents)
      : recommendedPriceCents * 1.15,
    recommendedPriceCents + 1,
    input.roundingMode ?? "ninety-nine"
  );
  const discountFloorPriceCents = roundPriceUp(
    minimumViablePriceCents / 0.85,
    minimumViablePriceCents / 0.85,
    input.roundingMode ?? "ninety-nine"
  );
  const grossMarginPct = (recommendedPriceCents * (1 - feePct) - totalCostCents) / recommendedPriceCents;
  const confidence = confidenceForMarketCount(marketPrices.length);
  const explanation = buildExplanation({
    hasMarket: Boolean(marketStats),
    positioning: input.positioning,
    recommendedPriceCents,
    minimumViablePriceCents,
    grossMarginPct,
    confidence,
  });

  return {
    ok: true,
    minimumViablePriceCents,
    recommendedPriceCents,
    stretchPriceCents,
    discountFloorPriceCents,
    feePct,
    grossMarginPct,
    confidence,
    warnings,
    explanation,
    marketStats,
  };
}

function sanitizePrices(prices: number[]): number[] {
  return prices
    .filter((price) => Number.isFinite(price) && price > 0)
    .map((price) => Math.round(price))
    .sort((a, b) => a - b);
}

function calculateMarketStats(prices: number[]): LaunchMarketStats {
  return {
    minCents: prices[0],
    maxCents: prices[prices.length - 1],
    medianCents: percentile(prices, 0.5),
    q1Cents: percentile(prices, 0.25),
    q3Cents: percentile(prices, 0.75),
  };
}

function percentile(sortedPrices: number[], pct: number): number {
  const index = (sortedPrices.length - 1) * pct;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedPrices[lowerIndex];
  }

  const weight = index - lowerIndex;
  return Math.round(sortedPrices[lowerIndex] * (1 - weight) + sortedPrices[upperIndex] * weight);
}

function marketTargetForPositioning(stats: LaunchMarketStats, positioning: LaunchPositioning): number {
  if (positioning === "budget") return (stats.minCents + stats.medianCents) / 2;
  if (positioning === "premium") return (stats.medianCents + stats.maxCents) / 2;
  return stats.medianCents;
}

function roundPriceUp(priceCents: number, floorCents: number, mode: LaunchRoundingMode): number {
  if (mode === "whole") {
    return Math.ceil(Math.max(priceCents, floorCents) / 100) * 100;
  }

  const floorSafePrice = Math.max(priceCents, floorCents);
  const dollars = Math.floor(floorSafePrice / 100);
  let rounded = dollars * 100 + 99;

  if (rounded < floorSafePrice) {
    rounded = (dollars + 1) * 100 + 99;
  }

  return rounded;
}

function confidenceForMarketCount(count: number): LaunchPlanConfidence {
  return count >= 3 ? "medium" : "low";
}

function buildExplanation(input: {
  hasMarket: boolean;
  positioning: LaunchPositioning;
  recommendedPriceCents: number;
  minimumViablePriceCents: number;
  grossMarginPct: number;
  confidence: LaunchPlanConfidence;
}): string {
  const anchor = input.hasMarket ? "market competitor prices" : "cost-only positioning markup";

  return `Recommended ${formatCents(input.recommendedPriceCents)} from ${anchor} for ${input.positioning} positioning, with a floor of ${formatCents(input.minimumViablePriceCents)} and projected gross margin of ${(input.grossMarginPct * 100).toFixed(1)}%. Confidence is ${input.confidence}.`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
