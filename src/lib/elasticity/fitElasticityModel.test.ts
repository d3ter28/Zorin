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

  it("effectiveSampleSize equals dataPoints when no dates provided", () => {
    const records = [
      { priceCents: 1000, unitsSold: 100 },
      { priceCents: 1500, unitsSold: 54 },
      { priceCents: 2000, unitsSold: 35 },
      { priceCents: 2500, unitsSold: 25 },
      { priceCents: 3000, unitsSold: 19 },
    ];
    const result = fitElasticityModel(records);
    expect(result!.effectiveSampleSize).toBeCloseTo(5, 4);
  });

  it("weights recent records more heavily than old ones", () => {
    const refDate = new Date("2025-01-01");

    // Old records (≈12 months ago) imply elasticity ≈ −2.0
    const old = [
      { priceCents: 1000, unitsSold: 100, date: new Date("2024-01-01") },
      { priceCents: 2000, unitsSold: 25,  date: new Date("2024-01-15") },
      { priceCents: 3000, unitsSold: 11,  date: new Date("2024-02-01") },
    ];
    // Recent records (≈1 week ago) imply elasticity ≈ −0.5
    const recent = [
      { priceCents: 1000, unitsSold: 100, date: new Date("2024-12-20") },
      { priceCents: 2000, unitsSold: 71,  date: new Date("2024-12-25") },
      { priceCents: 3000, unitsSold: 58,  date: new Date("2024-12-28") },
    ];

    const unweighted = fitElasticityModel([...old, ...recent], { referenceDate: refDate, halfLifeDays: Infinity });
    const weighted   = fitElasticityModel([...old, ...recent], { referenceDate: refDate, halfLifeDays: 90 });

    // Weighted fit should be dominated by recent records (less negative elasticity)
    expect(weighted!.elasticity).toBeGreaterThan(unweighted!.elasticity);
  });

  it("effectiveSampleSize is less than dataPoints when records have dates", () => {
    const refDate = new Date("2025-01-01");
    const records = [
      { priceCents: 1000, unitsSold: 100, date: new Date("2024-01-01") }, // ~365 days old → weight ≈ 0.06
      { priceCents: 1500, unitsSold: 54,  date: new Date("2024-01-15") },
      { priceCents: 2000, unitsSold: 35,  date: new Date("2024-12-25") }, // 7 days old → weight ≈ 0.95
      { priceCents: 2500, unitsSold: 25,  date: new Date("2024-12-28") },
      { priceCents: 3000, unitsSold: 19,  date: new Date("2024-12-30") },
    ];
    const result = fitElasticityModel(records, { referenceDate: refDate });
    expect(result!.effectiveSampleSize).toBeLessThan(result!.dataPoints);
  });
});
