import { simulateProfit } from "./simulateProfit";

export interface ElasticityModelParams {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  /** Not used by generateRecommendation — pass confidenceScore as the explicit 5th arg. */
  confidenceScore?: number | null;
}

export interface PricingRecommendation {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  deltaPct: number;
  reasoning: string;
  expectedProfitLiftPct: number;
  currentUnitsEstimate: number;
  projectedUnitsEstimate: number;
  currentProfitCents: number;
  projectedProfitCents: number;
  profitLiftCents: number;
}

export function generateRecommendation(
  model: ElasticityModelParams,
  currentPriceCents: number,
  cogsCents: number,
  marginFloorPct = 0.10,
  confidenceScore = 1.0
): PricingRecommendation {
  const minPriceCents = cogsCents / (1 - marginFloorPct);

  // Confidence-adjusted scan: ±10% at confidence=0, ±30% at confidence=1
  const clampedConf = Math.max(0, Math.min(1, confidenceScore));
  const scanWidth = 0.10 + 0.20 * clampedConf;
  const steps = 50;
  const scanLo = Math.round(currentPriceCents * (1 - scanWidth));
  const scanHi = Math.round(currentPriceCents * (1 + scanWidth));
  const trainLo = model.minPriceCents ? Math.round(model.minPriceCents * 0.8) : scanLo;
  const trainHi = model.maxPriceCents ? Math.round(model.maxPriceCents * 1.2) : scanHi;
  const lo = Math.max(scanLo, trainLo);
  const hi = Math.min(scanHi, trainHi);
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
  const confidenceNote = clampedConf < 0.4
    ? " Limited data — re-fit after collecting more sales records for a stronger signal."
    : "";

  const reasoning = action === "hold"
    ? `Demand elasticity is ${model.elasticity.toFixed(2)}. Current price is already near the profit-maximizing point.${confidenceNote}`
    : `Demand is ${elasticLabel} (elasticity = ${model.elasticity.toFixed(2)}). ` +
      `${action === "raise" ? "Raising" : "Lowering"} price ${pricePctStr} ${unitChangePct >= 0 ? "increases" : "reduces"} units by ~${Math.abs(unitChangePct).toFixed(0)}% ` +
      `but ${parseFloat(profitChangePct) >= 0 ? "grows" : "reduces"} gross profit by ~${Math.abs(parseFloat(profitChangePct))}%.${confidenceNote}`;

  const finalPriceCents = action === "hold" ? currentPriceCents : bestPriceCents;
  const projectedSim = action === "hold"
    ? currentSim
    : simulateProfit({
        elasticity: model.elasticity,
        intercept: model.intercept,
        currentPriceCents,
        candidatePriceCents: finalPriceCents,
        cogsCents,
      });

  return {
    action,
    suggestedPriceCents: finalPriceCents,
    deltaPct,
    reasoning,
    expectedProfitLiftPct,
    currentUnitsEstimate: currentSim.predictedUnits,
    projectedUnitsEstimate: projectedSim.predictedUnits,
    currentProfitCents: currentSim.predictedGrossProfitCents,
    projectedProfitCents: projectedSim.predictedGrossProfitCents,
    profitLiftCents: projectedSim.predictedGrossProfitCents - currentSim.predictedGrossProfitCents,
  };
}
