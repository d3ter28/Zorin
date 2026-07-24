import { describe, expect, it } from "vitest";
import { calculateReadiness } from "./calculateReadiness";

describe("calculateReadiness", () => {
  it("returns Launch Mode at 0 sales data points", () => {
    const result = calculateReadiness({
      salesDataPoints: 0,
      competitorPriceCount: 0,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(result.mode).toBe("launch");
    expect(result.label).toBe("Launch Mode");
    expect(result.summary).toContain("does not have enough sales history");
    expect(result.score).toBe(40);
    expect(result.evidence).toContain("Unit cost is present.");
    expect(result.evidence).toContain("Target margin is present.");
  });

  it("returns Learning Mode at 10 sales data points", () => {
    const result = calculateReadiness({
      salesDataPoints: 10,
      competitorPriceCount: 2,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(result.mode).toBe("learning");
    expect(result.label).toBe("Learning Mode");
    expect(result.score).toBe(75);
    expect(result.nextStep).toContain("Keep comparing");
  });

  it("returns Optimization Mode at 30 sales data points", () => {
    const result = calculateReadiness({
      salesDataPoints: 30,
      competitorPriceCount: 3,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(result.mode).toBe("optimization");
    expect(result.label).toBe("Optimization Mode");
    expect(result.score).toBe(100);
    expect(result.summary).toContain("demand-aware price optimization");
  });

  it("clamps invalid counts and increases score as evidence improves", () => {
    const weak = calculateReadiness({
      salesDataPoints: -5,
      competitorPriceCount: -2,
      hasUnitCost: false,
      hasTargetMargin: false,
    });
    const stronger = calculateReadiness({
      salesDataPoints: 9,
      competitorPriceCount: 3,
      hasUnitCost: true,
      hasTargetMargin: true,
    });

    expect(weak.score).toBe(0);
    expect(weak.mode).toBe("launch");
    expect(stronger.score).toBeGreaterThan(weak.score);
    expect(stronger.evidence).toContain("3 competitor prices are available.");
  });
});
