import { describe, expect, it } from "vitest";
import { calculateLaunchPlan } from "./calculateLaunchPlan";

const baseInput = {
  unitCostCents: 1200,
  shippingCents: 300,
  packagingCents: 100,
  otherUnitCostsCents: 0,
  paymentFeePct: 0.03,
  platformFeePct: 0.02,
  requiredMarginPct: 0.35,
  positioning: "mid-market" as const,
  competitorPricesCents: [],
  roundingMode: "ninety-nine" as const,
};

describe("calculateLaunchPlan", () => {
  it("rejects margin and fee combinations that leave too little pricing room", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      requiredMarginPct: 0.8,
      paymentFeePct: 0.1,
      platformFeePct: 0.05,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/margin and fee/i);
  });

  it("uses cost-only positioning markup when no competitor prices are supplied", () => {
    const result = calculateLaunchPlan(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.minimumViablePriceCents).toBe(2667);
    expect(result.recommendedPriceCents).toBe(3399);
    expect(result.confidence).toBe("low");
    expect(result.marketStats).toBeNull();
  });

  it("uses the market median for mid-market positioning and respects the floor", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [2900, 3500, 3900, 4200, 4900],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.marketStats?.medianCents).toBe(3900);
    expect(result.recommendedPriceCents).toBe(3999);
    expect(result.confidence).toBe("medium");
  });

  it("lifts a market target up when competitor prices sit below the margin floor", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [1900, 2100, 2300],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendedPriceCents).toBeGreaterThanOrEqual(result.minimumViablePriceCents);
    expect(result.warnings.join(" ")).toMatch(/market/i);
  });

  it("returns stretch and discount-safe prices above the recommended and floor anchors", () => {
    const result = calculateLaunchPlan(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stretchPriceCents).toBeGreaterThan(result.recommendedPriceCents);
    expect(Math.round(result.discountFloorPriceCents * 0.85)).toBeGreaterThanOrEqual(result.minimumViablePriceCents);
    expect(result.explanation.length).toBeGreaterThan(20);
  });
});
