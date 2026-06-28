import { compare } from "./comparison";
import { marginPct } from "./margin";
import type {
  CompetitorObservation,
  Decision,
  ProductInput,
  Signals,
} from "./types";

export const MIN_MARGIN_FLOOR = 0.15;
const POSITION_BAND = 0.1; // ±10% of median is "at market"

function floorPrice(cogs: number): number {
  return Math.round(cogs / (1 - MIN_MARGIN_FLOOR));
}

function deltaPct(from: number, to: number): number {
  return (to - from) / from;
}

export function decide(
  product: ProductInput,
  competitors: CompetitorObservation[],
): Decision {
  const cmp = compare(product.currentPrice, competitors);
  const margin = marginPct(product.currentPrice, product.cogs);
  const fp = product.cogs !== null ? floorPrice(product.cogs) : null;

  const signals: Signals = {
    marginPct: margin,
    compMedian: cmp.compMedian,
    compMin: cmp.compMin,
    compMax: cmp.compMax,
    pctVsMedian: cmp.pctVsMedian,
    marginFloorPrice: fp,
    competitorCount: cmp.competitorCount,
    oldestObservedAt: cmp.oldestObservedAt,
  };

  const hold = (reason: string): Decision => ({
    action: "hold",
    deltaPct: 0,
    suggestedPrice: product.currentPrice,
    reasons: [reason],
    signals,
  });

  // Rule 1: no competitor data
  if (cmp.competitorCount === 0) {
    return hold("Not enough competitor data to make a recommendation.");
  }

  // Rule 2: margin below floor (overrides position)
  if (margin !== null && fp !== null && margin < MIN_MARGIN_FLOOR) {
    return {
      action: "raise",
      deltaPct: deltaPct(product.currentPrice, fp),
      suggestedPrice: fp,
      reasons: [
        `Your current price is below your ${Math.round(
          MIN_MARGIN_FLOOR * 100,
        )}% margin floor.`,
        `Raising to the floor price protects profitability.`,
      ],
      signals,
    };
  }

  const median = cmp.compMedian!;
  const pos = cmp.pctVsMedian!;

  // Rule 3: priced >10% above median with healthy margin -> lower toward median
  if (pos > POSITION_BAND) {
    const target = fp !== null ? Math.max(median, fp) : median;
    const clamped = target >= product.currentPrice ? product.currentPrice : target;
    if (clamped < product.currentPrice) {
      const reasons = [
        `You're ${Math.round(pos * 100)}% above the competitor median.`,
      ];
      if (fp !== null && target === fp) {
        reasons.push(`Lowering stops at your margin floor price to protect margin.`);
      } else if (margin !== null) {
        reasons.push(
          `Lowering toward the median still leaves a ${Math.round(
            ((clamped - (product.cogs ?? 0)) / clamped) * 100,
          )}% margin.`,
        );
      }
      return {
        action: "lower",
        deltaPct: deltaPct(product.currentPrice, clamped),
        suggestedPrice: clamped,
        reasons,
        signals,
      };
    }
    return hold("You're competitively positioned given your margin floor.");
  }

  // Rule 4: priced >10% below median with headroom -> raise toward median
  if (pos < -POSITION_BAND) {
    return {
      action: "raise",
      deltaPct: deltaPct(product.currentPrice, median),
      suggestedPrice: median,
      reasons: [
        `You're ${Math.round(Math.abs(pos) * 100)}% below the competitor median.`,
        `Raising toward the median captures margin you're leaving on the table.`,
      ],
      signals,
    };
  }

  // Rule 5: within band -> hold
  return hold("You're competitively positioned near the market median.");
}
