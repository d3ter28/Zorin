export interface SimulateLaunchScenarioInput {
  priceCents: number;
  monthlyUnits: number;
  unitCostCents: number;
  shippingCents: number;
  packagingCents: number;
  otherUnitCostsCents: number;
  paymentFeePct: number;
  platformFeePct: number;
  adCostPerSaleCents: number;
  fixedMonthlyCostsCents: number;
  returnRatePct: number;
  discountPct: number;
}

export interface SimulateLaunchScenarioResult {
  effectivePriceCents: number;
  revenueCents: number;
  grossProfitCents: number;
  netProfitCents: number;
  contributionPerUnitCents: number;
  marginPct: number;
  breakEvenUnits: number | null;
  warnings: string[];
}

export function simulateLaunchScenario(input: SimulateLaunchScenarioInput): SimulateLaunchScenarioResult {
  const effectivePriceCents = Math.round(input.priceCents * (1 - input.discountPct));
  const keptUnits = input.monthlyUnits * (1 - input.returnRatePct);
  const feeCents = Math.round(effectivePriceCents * (input.paymentFeePct + input.platformFeePct));
  const variableCostCents =
    input.unitCostCents +
    input.shippingCents +
    input.packagingCents +
    input.otherUnitCostsCents +
    input.adCostPerSaleCents +
    feeCents;
  const contributionPerUnitCents = effectivePriceCents - variableCostCents;
  const revenueCents = Math.round(effectivePriceCents * keptUnits);
  const grossProfitCents = Math.round(contributionPerUnitCents * keptUnits);
  const netProfitCents = grossProfitCents - input.fixedMonthlyCostsCents;
  const warnings: string[] = [];

  if (contributionPerUnitCents <= 0) {
    warnings.push("Each sale loses money before fixed monthly costs.");
  }

  return {
    effectivePriceCents,
    revenueCents,
    contributionPerUnitCents,
    grossProfitCents,
    netProfitCents,
    marginPct: revenueCents === 0 ? 0 : grossProfitCents / revenueCents,
    breakEvenUnits:
      contributionPerUnitCents <= 0 ? null : Math.ceil(input.fixedMonthlyCostsCents / contributionPerUnitCents),
    warnings,
  };
}
