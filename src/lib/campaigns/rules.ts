import { marginPct } from "@/lib/margin";
import { calculateMarketStats } from "@/lib/pricing/marketStats";

export interface CampaignRules {
  mode: "percentage" | "ml_recommendation" | "competitor_match" | "fixed_price";
  percentage?: number;
  competitorStrategy?: "min" | "median";
  competitorOffset?: number;
  fixedPriceCents?: number;
  rounding: "none" | "99" | "95";
  marginFloorPct: number;
}

export interface RuleProduct {
  currentPrice: number;
  cogs: number | null;
  recommendation?: { rulesJson: string } | null;
  competitorPrices?: { priceCents: number }[];
}

export interface TargetPriceResult {
  targetPriceCents: number;
  skipped: boolean;
  skipReason?: string;
  clampedByMarginFloor: boolean;
}

function computeBasePrice(
  product: RuleProduct,
  rules: CampaignRules,
): { price: number; skipped: boolean; skipReason?: string } {
  switch (rules.mode) {
    case "percentage": {
      const pct = rules.percentage ?? 0;
      return { price: Math.round(product.currentPrice * (1 + pct / 100)), skipped: false };
    }

    case "ml_recommendation": {
      if (!product.recommendation) {
        return { price: 0, skipped: true, skipReason: "no_recommendation" };
      }
      try {
        const parsed = JSON.parse(product.recommendation.rulesJson) as { suggestedPriceCents?: number };
        if (!parsed.suggestedPriceCents) {
          return { price: 0, skipped: true, skipReason: "no_recommendation" };
        }
        return { price: parsed.suggestedPriceCents, skipped: false };
      } catch {
        return { price: 0, skipped: true, skipReason: "no_recommendation" };
      }
    }

    case "competitor_match": {
      const prices = product.competitorPrices
        ?.map((cp) => cp.priceCents)
        .sort((a, b) => a - b);
      if (!prices || prices.length === 0) {
        return { price: 0, skipped: true, skipReason: "no_competitor_data" };
      }
      const stats = calculateMarketStats(prices);
      const strategy = rules.competitorStrategy ?? "median";
      const baseRef = strategy === "min" ? stats.minCents : stats.medianCents;
      const offset = rules.competitorOffset ?? 0;
      return { price: Math.round(baseRef * (1 + offset / 100)), skipped: false };
    }

    case "fixed_price": {
      const fixed = rules.fixedPriceCents;
      if (!fixed || fixed <= 0) {
        return { price: 0, skipped: true, skipReason: "invalid_fixed_price" };
      }
      return { price: fixed, skipped: false };
    }

    default:
      return { price: 0, skipped: true, skipReason: "unknown_mode" };
  }
}

function applyMarginFloor(
  priceCents: number,
  cogs: number | null,
  marginFloorPct: number,
): { price: number; clamped: boolean } {
  if (cogs === null) return { price: priceCents, clamped: false };
  const margin = marginPct(priceCents, cogs);
  if (margin !== null && margin < marginFloorPct / 100) {
    const floorPrice = Math.ceil(cogs / (1 - marginFloorPct / 100));
    return { price: floorPrice, clamped: true };
  }
  return { price: priceCents, clamped: false };
}

function applyRounding(priceCents: number, rounding: CampaignRules["rounding"]): number {
  if (rounding === "none") return priceCents;
  const wholeDollars = Math.round(priceCents / 100) * 100;
  if (rounding === "99") return wholeDollars - 1;
  if (rounding === "95") return wholeDollars - 5;
  return priceCents;
}

export function calculateTargetPrice(product: RuleProduct, rules: CampaignRules): TargetPriceResult {
  const base = computeBasePrice(product, rules);
  if (base.skipped) {
    return { targetPriceCents: 0, skipped: true, skipReason: base.skipReason, clampedByMarginFloor: false };
  }

  const { price: afterFloor, clamped } = applyMarginFloor(base.price, product.cogs, rules.marginFloorPct);
  const afterRounding = applyRounding(afterFloor, rules.rounding);

  // Re-enforce margin floor after rounding: rounding down can violate the floor.
  let finalPrice = Math.max(afterRounding, 1);
  if (product.cogs !== null) {
    const floorPrice = Math.ceil(product.cogs / (1 - rules.marginFloorPct / 100));
    if (finalPrice < floorPrice) {
      finalPrice = floorPrice;
    }
  }

  if (finalPrice === product.currentPrice) {
    return { targetPriceCents: finalPrice, skipped: true, skipReason: "no_change", clampedByMarginFloor: clamped };
  }

  return { targetPriceCents: finalPrice, skipped: false, clampedByMarginFloor: clamped };
}
