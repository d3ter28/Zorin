export type LaunchRiskLevel = "low" | "medium" | "high";

export interface BreakEvenPlanInput {
  recommendedPriceCents: number;
  minimumViablePriceCents: number;
  effectivePriceCents: number;
  monthlyUnits: number;
  unitCostTotalCents: number;
  feePct: number;
  adCostPerSaleCents: number;
  fixedMonthlyCostsCents: number;
  returnRatePct: number;
  discountPct: number;
}

export interface BreakEvenPlanResult {
  breakEvenUnits: number | null;
  maxSafeAdSpendCents: number | null;
  discountSafePriceCents: number;
  returnRateStress: {
    testedReturnRatePct: number;
    netProfitCents: number;
    risk: LaunchRiskLevel;
  };
  discountStress: {
    testedDiscountPct: number;
    netProfitCents: number;
    risk: LaunchRiskLevel;
  };
  viability: {
    risk: LaunchRiskLevel;
    headline: string;
    explanation: string;
  };
  warnings: string[];
}

export function calculateBreakEvenPlan(input: BreakEvenPlanInput): BreakEvenPlanResult {
  const normalized = normalizeInput(input);
  const contributionBeforeAdsCents = contributionFor({
    ...normalized,
    adCostPerSaleCents: 0,
  });
  const contributionPerUnitCents = contributionFor(normalized);
  const revenueCents = Math.round(
    normalized.effectivePriceCents * normalized.monthlyUnits * (1 - normalized.returnRatePct)
  );
  const netProfitCents = contributionPerUnitCents * normalized.monthlyUnits - normalized.fixedMonthlyCostsCents;
  const breakEvenUnits =
    contributionPerUnitCents <= 0 ? null : Math.ceil(normalized.fixedMonthlyCostsCents / contributionPerUnitCents);
  const maxSafeAdSpendCents = contributionBeforeAdsCents <= 0 ? null : contributionBeforeAdsCents;
  const discountSafePriceCents = calculateDiscountSafePrice(normalized);
  const returnRateStress = stressReturnRate(normalized);
  const discountStress = stressDiscount(normalized);
  const risk = riskFor({
    contributionPerUnitCents,
    netProfitCents,
    revenueCents,
  });
  const warnings: string[] = [];

  if (maxSafeAdSpendCents === null) {
    warnings.push("This launch loses money before advertising.");
  }

  return {
    breakEvenUnits,
    maxSafeAdSpendCents,
    discountSafePriceCents,
    returnRateStress,
    discountStress,
    viability: viabilityFor(risk),
    warnings,
  };
}

function normalizeInput(input: BreakEvenPlanInput): BreakEvenPlanInput {
  return {
    recommendedPriceCents: clampMoney(input.recommendedPriceCents),
    minimumViablePriceCents: clampMoney(input.minimumViablePriceCents),
    effectivePriceCents: clampMoney(input.effectivePriceCents),
    monthlyUnits: Math.max(0, Math.floor(Number.isFinite(input.monthlyUnits) ? input.monthlyUnits : 0)),
    unitCostTotalCents: clampMoney(input.unitCostTotalCents),
    feePct: clampPct(input.feePct),
    adCostPerSaleCents: clampMoney(input.adCostPerSaleCents),
    fixedMonthlyCostsCents: clampMoney(input.fixedMonthlyCostsCents),
    returnRatePct: clampPct(input.returnRatePct),
    discountPct: clampPct(input.discountPct),
  };
}

function contributionFor(
  input: Pick<
    BreakEvenPlanInput,
    "effectivePriceCents" | "returnRatePct" | "unitCostTotalCents" | "feePct" | "adCostPerSaleCents"
  >
): number {
  const revenuePerOrderedUnitCents = input.effectivePriceCents * (1 - input.returnRatePct);
  const feeCents = Math.round(input.effectivePriceCents * input.feePct);

  return Math.round(revenuePerOrderedUnitCents - input.unitCostTotalCents - feeCents - input.adCostPerSaleCents);
}

function calculateDiscountSafePrice(input: BreakEvenPlanInput): number {
  const discountMultiplier = 1 - input.discountPct;
  if (discountMultiplier <= 0) {
    return input.minimumViablePriceCents;
  }

  return Math.ceil(input.minimumViablePriceCents / discountMultiplier);
}

function stressReturnRate(input: BreakEvenPlanInput): BreakEvenPlanResult["returnRateStress"] {
  const testedReturnRatePct = Math.min(0.95, input.returnRatePct + 0.1);
  const contribution = contributionFor({
    ...input,
    returnRatePct: testedReturnRatePct,
  });
  const netProfitCents = contribution * input.monthlyUnits - input.fixedMonthlyCostsCents;
  const revenueCents = Math.round(input.effectivePriceCents * input.monthlyUnits * (1 - testedReturnRatePct));

  return {
    testedReturnRatePct,
    netProfitCents,
    risk: riskFor({
      contributionPerUnitCents: contribution,
      netProfitCents,
      revenueCents,
    }),
  };
}

function stressDiscount(input: BreakEvenPlanInput): BreakEvenPlanResult["discountStress"] {
  const testedDiscountPct = Math.min(0.95, input.discountPct + 0.1);
  const effectivePriceCents = Math.round(input.recommendedPriceCents * (1 - testedDiscountPct));
  const contribution = contributionFor({
    ...input,
    effectivePriceCents,
  });
  const netProfitCents = contribution * input.monthlyUnits - input.fixedMonthlyCostsCents;
  const revenueCents = Math.round(effectivePriceCents * input.monthlyUnits * (1 - input.returnRatePct));

  return {
    testedDiscountPct,
    netProfitCents,
    risk: riskFor({
      contributionPerUnitCents: contribution,
      netProfitCents,
      revenueCents,
    }),
  };
}

function riskFor(input: { contributionPerUnitCents: number; netProfitCents: number; revenueCents: number }): LaunchRiskLevel {
  if (input.contributionPerUnitCents <= 0 || input.netProfitCents < 0) {
    return "high";
  }

  if (input.revenueCents <= 0) {
    return "high";
  }

  return input.netProfitCents / input.revenueCents < 0.15 ? "medium" : "low";
}

function viabilityFor(risk: LaunchRiskLevel): BreakEvenPlanResult["viability"] {
  if (risk === "low") {
    return {
      risk,
      headline: "This launch has room to absorb normal discounting and returns.",
      explanation: "The current assumptions leave enough contribution after product costs, fees, ads, and fixed costs.",
    };
  }

  if (risk === "medium") {
    return {
      risk,
      headline: "This launch can work, but the buffer is thin.",
      explanation: "Discounts, ad costs, or returns could quickly erase profit, so watch early performance closely.",
    };
  }

  return {
    risk,
    headline: "This launch is fragile.",
    explanation: "The current assumptions do not leave enough contribution per order or enough net profit.",
  };
}

function clampMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.95, Math.max(0, value));
}
