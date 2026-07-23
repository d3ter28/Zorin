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
    if (result.ok) throw new Error("Expected launch plan calculation to fail");
    expect(result.error).toMatch(/margin and fee/i);
  });

  it("uses cost-only positioning markup when no competitor prices are supplied", () => {
    const result = calculateLaunchPlan(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feePct).toBe(0.05);
    expect(result.minimumViablePriceCents).toBe(2667);
    expect(result.recommendedPriceCents).toBe(3399);
    expect(result.confidence).toBe("low");
    expect(result.marketStats).toBeNull();
  });

  it("uses the budget cost-only fallback markup", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      unitCostCents: 1208,
      positioning: "budget",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendedPriceCents).toBe(2999);
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

  it("targets the midpoint between market low and median for budget positioning", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      positioning: "budget",
      competitorPricesCents: [3000, 7000, 8000, 9000, 10000],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.marketStats?.minCents).toBe(3000);
    expect(result.marketStats?.medianCents).toBe(8000);
    expect(result.marketStats?.q1Cents).toBe(7000);
    expect(result.recommendedPriceCents).toBe(5599);
  });

  it("targets the midpoint between median and market high for premium positioning", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      positioning: "premium",
      competitorPricesCents: [3000, 4000, 5000, 6000, 10000],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.marketStats?.medianCents).toBe(5000);
    expect(result.marketStats?.maxCents).toBe(10000);
    expect(result.marketStats?.q3Cents).toBe(6000);
    expect(result.recommendedPriceCents).toBe(7599);
  });

  it("keeps confidence low until at least three valid competitor prices exist", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [0, -100, 3200, 3600],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.confidence).toBe("low");
  });

  it("does not return a high confidence state for larger market sets", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [2900, 3100, 3300, 3500, 3700, 3900, 4100, 4300],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.confidence).toBe("medium");
  });

  it("uses market high as the market-data stretch anchor when it exceeds the percentage stretch", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      competitorPricesCents: [2900, 3500, 3900, 4200, 4900],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stretchPriceCents).toBe(4999);
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

  it("supports whole-dollar upward rounding", () => {
    const result = calculateLaunchPlan({
      ...baseInput,
      positioning: "budget",
      roundingMode: "whole",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendedPriceCents).toBe(3000);
  });
});
