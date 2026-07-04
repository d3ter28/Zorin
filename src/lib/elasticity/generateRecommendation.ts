import { simulateProfit } from "./simulateProfit";

export interface ElasticityModelParams {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
}

export interface PricingRecommendation {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  deltaPct: number;
  reasoning: string;
  expectedProfitLiftPct: number;
}

export function generateRecommendation(
  model: ElasticityModelParams,
  currentPriceCents: number,
  cogsCents: number,
  marginFloorPct = 0.10
): PricingRecommendation {
  // Minimum price to maintain margin floor
  const minPriceCents = cogsCents / (1 - marginFloorPct);

  // Scan candidate prices: ±50% of current in 2% steps
  const steps = 50;
  const range = 0.5;
  const lo = Math.round(currentPriceCents * (1 - range));
  const hi = Math.round(currentPriceCents * (1 + range));
  const step = Math.round((hi - lo) / steps);

  let bestPriceCents = currentPriceCents;
  let bestProfit = simulateProfit({
    elasticity: model.elasticity,
    intercept: model.intercept,
    currentPriceCents,
    candidatePriceCents: currentPriceCents,
    cogsCents,
  }).predictedGrossProfitCents;

  for (let p = lo; p <= hi; p += Math.max(1, step)) {
    if (p < minPriceCents) continue;
    const sim = simulateProfit({
      elasticity: model.elasticity,
      intercept: model.intercept,
      currentPriceCents,
      candidatePriceCents: p,
      cogsCents,
    });
    if (sim.predictedGrossProfitCents > bestProfit) {
      bestProfit = sim.predictedGrossProfitCents;
      bestPriceCents = p;
    }
  }

  const deltaPct = (bestPriceCents - currentPriceCents) / currentPriceCents;
  const action = Math.abs(deltaPct) < 0.01
    ? "hold"
    : deltaPct > 0 ? "raise" : "lower";

  const currentSim = simulateProfit({
    elasticity: model.elasticity,
    intercept: model.intercept,
    currentPriceCents,
    candidatePriceCents: currentPriceCents,
    cogsCents,
  });
  const expectedProfitLiftPct = currentSim.predictedGrossProfitCents > 0
    ? (bestProfit - currentSim.predictedGrossProfitCents) / currentSim.predictedGrossProfitCents
    : 0;

  const elasticLabel = Math.abs(model.elasticity) < 1 ? "inelastic" : "elastic";
  const pricePctStr = `${(Math.abs(deltaPct) * 100).toFixed(0)}%`;
  const unitChangePct = (Math.exp(model.elasticity * Math.log(1 + deltaPct)) - 1) * 100;
  const profitChangePct = (expectedProfitLiftPct * 100).toFixed(0);

  const reasoning = action === "hold"
    ? `Demand elasticity is ${model.elasticity.toFixed(2)}. Current price is already near the profit-maximizing point.`
    : `Demand is ${elasticLabel} (elasticity = ${model.elasticity.toFixed(2)}). ` +
      `${action === "raise" ? "Raising" : "Lowering"} price ${pricePctStr} reduces units by ~${Math.abs(unitChangePct).toFixed(0)}% ` +
      `but ${parseFloat(profitChangePct) >= 0 ? "grows" : "reduces"} gross profit by ~${Math.abs(parseFloat(profitChangePct))}%.`;

  return { action, suggestedPriceCents: bestPriceCents, deltaPct, reasoning, expectedProfitLiftPct };
}
