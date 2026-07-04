import { describe, it, expect } from "vitest";
import { simulateProfit } from "./simulateProfit";

describe("simulateProfit", () => {
  it("predicts lower demand at higher price", () => {
    // elasticity = -1.5, intercept fitted to 100 units at $10
    // intercept = ln(100) - (-1.5)*ln(1000) = 4.605 + 10.35 = 14.955
    const base = { elasticity: -1.5, intercept: 14.955, currentPriceCents: 1000, cogsCents: 500 };
    const at1000 = simulateProfit({ ...base, candidatePriceCents: 1000 });
    const at1200 = simulateProfit({ ...base, candidatePriceCents: 1200 });
    expect(at1200.predictedUnits).toBeLessThan(at1000.predictedUnits);
  });

  it("computes gross profit correctly", () => {
    const result = simulateProfit({
      elasticity: -1.5,
      intercept: 14.955,
      currentPriceCents: 1000,
      candidatePriceCents: 1000,
      cogsCents: 500,
    });
    // margin = (1000-500)/1000 = 50%
    expect(result.marginPct).toBeCloseTo(0.5, 2);
    expect(result.predictedGrossProfitCents).toBeCloseTo(result.predictedUnits * 500, 0);
  });
});
