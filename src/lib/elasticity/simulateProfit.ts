export interface SimulationInput {
  elasticity: number;
  intercept: number;
  currentPriceCents: number;
  candidatePriceCents: number;
  cogsCents: number;
}

export interface SimulationResult {
  predictedUnits: number;
  predictedRevenueCents: number;
  predictedGrossProfitCents: number;
  marginPct: number;
}

export function simulateProfit(input: SimulationInput): SimulationResult {
  const { elasticity, intercept, candidatePriceCents, cogsCents } = input;
  const lnPrice = Math.log(candidatePriceCents);
  const predictedUnits = Math.exp(intercept + elasticity * lnPrice);
  const predictedRevenueCents = predictedUnits * candidatePriceCents;
  const unitMarginCents = candidatePriceCents - cogsCents;
  const predictedGrossProfitCents = predictedUnits * unitMarginCents;
  const marginPct = candidatePriceCents > 0 ? unitMarginCents / candidatePriceCents : 0;
  return { predictedUnits, predictedRevenueCents, predictedGrossProfitCents, marginPct };
}
