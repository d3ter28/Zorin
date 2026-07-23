import { describe, expect, it } from "vitest";
import { simulateLaunchScenario } from "./simulateLaunchScenario";

const baseInput = {
  priceCents: 4000,
  monthlyUnits: 100,
  unitCostCents: 1200,
  shippingCents: 300,
  packagingCents: 100,
  otherUnitCostsCents: 0,
  paymentFeePct: 0.03,
  platformFeePct: 0.02,
  adCostPerSaleCents: 400,
  fixedMonthlyCostsCents: 50000,
  returnRatePct: 0,
  discountPct: 0,
};

describe("simulateLaunchScenario", () => {
  it("calculates monthly launch economics without returns or discount", () => {
    const result = simulateLaunchScenario(baseInput);

    expect(result.effectivePriceCents).toBe(4000);
    expect(result.revenueCents).toBe(400000);
    expect(result.contributionPerUnitCents).toBe(1800);
    expect(result.grossProfitCents).toBe(180000);
    expect(result.netProfitCents).toBe(130000);
    expect(result.breakEvenUnits).toBe(28);
    expect(result.marginPct).toBe(0.45);
  });

  it("reduces revenue for returns and price for discounts", () => {
    const result = simulateLaunchScenario({
      ...baseInput,
      discountPct: 0.1,
      returnRatePct: 0.2,
    });

    expect(result.effectivePriceCents).toBe(3600);
    expect(result.revenueCents).toBe(288000);
    expect(result.grossProfitCents).toBe(70000);
    expect(result.netProfitCents).toBe(20000);
  });

  it("reports no break-even point when each sale loses money", () => {
    const result = simulateLaunchScenario({
      ...baseInput,
      priceCents: 1800,
      adCostPerSaleCents: 1000,
    });

    expect(result.contributionPerUnitCents).toBeLessThanOrEqual(0);
    expect(result.breakEvenUnits).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/loses money/i);
  });
});
