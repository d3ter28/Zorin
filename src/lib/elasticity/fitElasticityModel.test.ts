import { describe, it, expect } from "vitest";
import { fitElasticityModel } from "./fitElasticityModel";

describe("fitElasticityModel", () => {
  it("returns null for fewer than 3 records", () => {
    expect(fitElasticityModel([{ priceCents: 1000, unitsSold: 5 }])).toBeNull();
    expect(fitElasticityModel([])).toBeNull();
  });

  it("fits a known-elasticity dataset", () => {
    // Construct data: units = 100 * (price/100)^(-1.5) → elasticity should be ~-1.5
    const records = [
      { priceCents: 1000, unitsSold: 100 },
      { priceCents: 1500, unitsSold: 54 },
      { priceCents: 2000, unitsSold: 35 },
      { priceCents: 2500, unitsSold: 25 },
      { priceCents: 3000, unitsSold: 19 },
    ];
    const result = fitElasticityModel(records);
    expect(result).not.toBeNull();
    expect(result!.elasticity).toBeCloseTo(-1.5, 1);
    expect(result!.r2).toBeGreaterThan(0.99);
    expect(result!.dataPoints).toBe(5);
  });

  it("excludes zero/negative records before fitting", () => {
    const records = [
      { priceCents: 0, unitsSold: 10 },  // excluded
      { priceCents: 1000, unitsSold: 0 }, // excluded
      { priceCents: 1000, unitsSold: 100 },
      { priceCents: 1500, unitsSold: 54 },
      { priceCents: 2000, unitsSold: 35 },
    ];
    const result = fitElasticityModel(records);
    expect(result!.dataPoints).toBe(3);
  });

  it("returns dataPoints count", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      priceCents: 1000 + i * 200,
      unitsSold: Math.max(1, 50 - i * 5),
    }));
    expect(fitElasticityModel(records)!.dataPoints).toBe(6);
  });
});
