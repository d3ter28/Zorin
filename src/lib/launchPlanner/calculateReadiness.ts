export interface PriceReadinessInput {
  salesDataPoints: number;
  competitorPriceCount: number;
  hasUnitCost: boolean;
  hasTargetMargin: boolean;
}

export type PriceReadinessMode = "launch" | "learning" | "optimization";

export interface PriceReadinessResult {
  mode: PriceReadinessMode;
  score: number;
  label: string;
  summary: string;
  nextStep: string;
  evidence: string[];
}

export function calculateReadiness(input: PriceReadinessInput): PriceReadinessResult {
  const salesDataPoints = clampInteger(input.salesDataPoints, 0, 999);
  const competitorPriceCount = clampInteger(input.competitorPriceCount, 0, 999);
  const score =
    (input.hasUnitCost ? 25 : 0) +
    (input.hasTargetMargin ? 15 : 0) +
    competitorScore(competitorPriceCount) +
    salesScore(salesDataPoints);
  const mode = readinessMode(salesDataPoints);

  return {
    mode,
    score,
    ...copyForMode(mode),
    evidence: buildEvidence({
      salesDataPoints,
      competitorPriceCount,
      hasUnitCost: input.hasUnitCost,
      hasTargetMargin: input.hasTargetMargin,
    }),
  };
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function competitorScore(count: number): number {
  if (count >= 3) return 20;
  if (count >= 1) return 10;
  return 0;
}

function salesScore(points: number): number {
  if (points >= 30) return 40;
  if (points >= 10) return 25;
  if (points >= 1) return 15;
  return 0;
}

function readinessMode(points: number): PriceReadinessMode {
  if (points >= 30) return "optimization";
  if (points >= 10) return "learning";
  return "launch";
}

function copyForMode(mode: PriceReadinessMode): Omit<PriceReadinessResult, "mode" | "score" | "evidence"> {
  if (mode === "optimization") {
    return {
      label: "Optimization Mode",
      summary: "Zorin has enough sales history to support demand-aware price optimization.",
      nextStep: "Use Launch Planner as a guardrail, then compare against historical product recommendations.",
    };
  }

  if (mode === "learning") {
    return {
      label: "Learning Mode",
      summary: "Zorin has early sales evidence, but recommendations should still be checked against launch economics.",
      nextStep: "Keep comparing margin, returns, and early conversion before trusting demand signals fully.",
    };
  }

  return {
    label: "Launch Mode",
    summary: "Zorin is using cost, margin, and market assumptions because this product does not have enough sales history yet.",
    nextStep: "Add competitor prices and keep the launch above break-even while sales history builds.",
  };
}

function buildEvidence(input: Required<PriceReadinessInput>): string[] {
  const evidence: string[] = [];

  evidence.push(input.hasUnitCost ? "Unit cost is present." : "Unit cost is missing.");
  evidence.push(input.hasTargetMargin ? "Target margin is present." : "Target margin is missing.");

  if (input.competitorPriceCount === 0) {
    evidence.push("No competitor prices are available.");
  } else if (input.competitorPriceCount === 1) {
    evidence.push("1 competitor price is available.");
  } else {
    evidence.push(`${input.competitorPriceCount} competitor prices are available.`);
  }

  if (input.salesDataPoints === 0) {
    evidence.push("No sales history is available yet.");
  } else if (input.salesDataPoints === 1) {
    evidence.push("1 sales data point is available.");
  } else {
    evidence.push(`${input.salesDataPoints} sales data points are available.`);
  }

  return evidence;
}
