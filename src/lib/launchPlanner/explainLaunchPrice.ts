import type {
  LaunchMarketStats,
  LaunchPlanConfidence,
  LaunchPositioning,
} from "./calculateLaunchPlan";
import type { PriceReadinessMode } from "./calculateReadiness";

export interface ExplainLaunchPriceInput {
  minimumViablePriceCents: number;
  recommendedPriceCents: number;
  positioning: LaunchPositioning;
  competitorPriceCount: number;
  marketStats: LaunchMarketStats | null;
  confidence: LaunchPlanConfidence;
  readinessMode: PriceReadinessMode;
}

export interface PriceExplanation {
  headline: string;
  bullets: string[];
}

export function explainLaunchPrice(input: ExplainLaunchPriceInput): PriceExplanation {
  if (!input.marketStats) {
    return {
      headline: `Zorin is recommending ${formatCents(input.recommendedPriceCents)} for ${input.positioning} positioning because there are no market references yet.`,
      bullets: [
        `Your minimum viable price is ${formatCents(input.minimumViablePriceCents)}.`,
        "The recommendation adds a launch markup for your chosen positioning.",
        "Add competitor prices to improve confidence before committing inventory or ad spend.",
        readinessBullet(input.readinessMode),
      ],
    };
  }

  return {
    headline: `Zorin is anchoring this launch at ${formatCents(input.recommendedPriceCents)} for ${input.positioning} positioning because it clears your margin floor and sits near the market median.`,
    bullets: [
      `Your minimum viable price is ${formatCents(input.minimumViablePriceCents)} after product cost, fulfillment, and fees.`,
      `You supplied ${input.competitorPriceCount} competitor prices, giving this launch a ${input.confidence}-confidence market reference.`,
      `The market median is ${formatCents(input.marketStats.medianCents)}, with a range from ${formatCents(input.marketStats.minCents)} to ${formatCents(input.marketStats.maxCents)}.`,
      readinessBullet(input.readinessMode),
    ],
  };
}

function readinessBullet(mode: PriceReadinessMode): string {
  if (mode === "optimization") {
    return "This product has enough sales history for demand-aware recommendations, so treat Launch Planner as a margin guardrail.";
  }

  if (mode === "learning") {
    return "This product has early sales evidence, so keep checking launch assumptions against real demand.";
  }

  return "This product is still in Launch Mode, so the recommendation is based on assumptions rather than proven demand.";
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
