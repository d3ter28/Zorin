import { describe, it, expect } from "vitest";
import { calculateVanWestendorp } from "./vanWestendorp";

describe("calculateVanWestendorp", () => {
  it("returns an all-zero, no-confidence result for an empty response set", () => {
    const result = calculateVanWestendorp([]);
    expect(result).toEqual({
      pointOfMarginalCheapness: 0,
      pointOfMarginalExpensiveness: 0,
      optimalPricePoint: 0,
      indifferencePricePoint: 0,
      acceptableRange: { min: 0, max: 0 },
      responseCount: 0,
      confidence: "none",
    });
  });

  it("computes hand-verified intersections for a single response", () => {
    // One respondent: too cheap $5, good value $10, getting expensive $15, too expensive $20.
    // Hand-derived: PMC = 1000, PME = 1500, OPP = 1000, IPP = 1250
    const result = calculateVanWestendorp([
      { tooCheapCents: 500, goodValueCents: 1000, gettingExpensiveCents: 1500, tooExpensiveCents: 2000 },
    ]);
    expect(result.pointOfMarginalCheapness).toBe(1000);
    expect(result.pointOfMarginalExpensiveness).toBe(1500);
    expect(result.optimalPricePoint).toBe(1000);
    expect(result.indifferencePricePoint).toBe(1250);
    expect(result.acceptableRange).toEqual({ min: 1000, max: 1500 });
    expect(result.responseCount).toBe(1);
    expect(result.confidence).toBe("none");
  });

  it("tiers confidence at the 5 and 20 response boundaries", () => {
    const make = (n: number) =>
      Array.from({ length: n }, () => ({
        tooCheapCents: 500,
        goodValueCents: 1000,
        gettingExpensiveCents: 1500,
        tooExpensiveCents: 2000,
      }));

    expect(calculateVanWestendorp(make(4)).confidence).toBe("none");
    expect(calculateVanWestendorp(make(5)).confidence).toBe("low");
    expect(calculateVanWestendorp(make(19)).confidence).toBe("low");
    expect(calculateVanWestendorp(make(20)).confidence).toBe("good");
  });

  it("handles multiple distinct responses without throwing and keeps acceptableRange.min <= max", () => {
    const result = calculateVanWestendorp([
      { tooCheapCents: 400, goodValueCents: 900, gettingExpensiveCents: 1400, tooExpensiveCents: 1900 },
      { tooCheapCents: 600, goodValueCents: 1100, gettingExpensiveCents: 1600, tooExpensiveCents: 2100 },
      { tooCheapCents: 500, goodValueCents: 1000, gettingExpensiveCents: 1500, tooExpensiveCents: 2000 },
    ]);
    expect(result.responseCount).toBe(3);
    expect(result.acceptableRange.min).toBeLessThanOrEqual(result.acceptableRange.max);
  });
});
