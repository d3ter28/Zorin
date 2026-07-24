import { describe, expect, it } from "vitest";
import { calculateBreakEvenPlan } from "./calculateBreakEvenPlan";

const profitableInput = {
  recommendedPriceCents: 3999,
  minimumViablePriceCents: 2870,
  effectivePriceCents: 3999,
  monthlyUnits: 100,
  unitCostTotalCents: 1600,
  feePct: 0.05,
  adCostPerSaleCents: 400,
  fixedMonthlyCostsCents: 50000,
  returnRatePct: 0.05,
  discountPct: 0,
};

describe("calculateBreakEvenPlan", () => {
  it("returns break-even units and max safe ad spend when contribution is positive", () => {
    const result = calculateBreakEvenPlan(profitableInput);

    expect(result.breakEvenUnits).toBe(28);
    expect(result.maxSafeAdSpendCents).toBe(2199);
    expect(result.discountSafePriceCents).toBe(2870);
    expect(result.viability.risk).toBe("low");
    expect(result.warnings).toEqual([]);
  });

  it("returns null max safe ad spend when launch loses money before ads", () => {
    const result = calculateBreakEvenPlan({
      ...profitableInput,
      effectivePriceCents: 1500,
      unitCostTotalCents: 1800,
      adCostPerSaleCents: 0,
    });

    expect(result.breakEvenUnits).toBeNull();
    expect(result.maxSafeAdSpendCents).toBeNull();
    expect(result.viability.risk).toBe("high");
    expect(result.warnings).toContain("This launch loses money before advertising.");
  });

  it("marks negative net profit as high risk", () => {
    const result = calculateBreakEvenPlan({
      ...profitableInput,
      monthlyUnits: 5,
      fixedMonthlyCostsCents: 100000,
    });

    expect(result.viability.risk).toBe("high");
    expect(result.viability.headline).toContain("fragile");
  });

  it("stress tests return rate and discount by 10 points capped at 95 percent", () => {
    const result = calculateBreakEvenPlan({
      ...profitableInput,
      returnRatePct: 0.9,
      discountPct: 0.9,
    });

    expect(result.returnRateStress.testedReturnRatePct).toBe(0.95);
    expect(result.discountStress.testedDiscountPct).toBe(0.95);
  });
});
