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

  it("falls back to the single grid point when every response has identical values", () => {
    // 3 respondents who all gave the same value (1000) for all four fields collapse the
    // grid (the deduped, sorted set of every field value across every respondent) down to
    // a single point: [1000]. That hits findIntersection's `grid.length === 1` fallback
    // for all four intersections (PMC, PME, OPP, IPP) directly, before the crossing-search
    // loop ever runs, and each one returns that single grid point unchanged.
    // Verified by hand: cumulativeAtLeast/cumulativeAtMost at p=1000 are irrelevant here
    // since the length-1 guard returns grid[0] (1000) immediately for every intersection.
    const result = calculateVanWestendorp([
      { tooCheapCents: 1000, goodValueCents: 1000, gettingExpensiveCents: 1000, tooExpensiveCents: 1000 },
      { tooCheapCents: 1000, goodValueCents: 1000, gettingExpensiveCents: 1000, tooExpensiveCents: 1000 },
      { tooCheapCents: 1000, goodValueCents: 1000, gettingExpensiveCents: 1000, tooExpensiveCents: 1000 },
    ]);
    expect(result.pointOfMarginalCheapness).toBe(1000);
    expect(result.pointOfMarginalExpensiveness).toBe(1000);
    expect(result.optimalPricePoint).toBe(1000);
    expect(result.indifferencePricePoint).toBe(1000);
    expect(result.acceptableRange).toEqual({ min: 1000, max: 1000 });
  });

  it("takes the diff1 === 0 early return when curves cross exactly at a grid point", () => {
    // Two respondents chosen so that at the lowest grid price (1), the "too cheap" and
    // "getting expensive" cumulative curves are exactly equal, hitting findIntersection's
    // `diff1 === 0` early return (an exact crossing at a grid point, not interpolated).
    //
    // Grid (deduped, sorted, all four fields across both respondents): [1, 2, 4, 5, 6, 7].
    //
    // Hand-verified for pointOfMarginalCheapness = findIntersection(grid, tooCheap, gettingExpensive):
    //   decreasing = tooCheap:      P(tooCheapCents >= 1)        = 2/2 = 1  (values 5, 4)
    //   increasing = gettingExpensive: P(gettingExpensiveCents <= 1) = 2/2 = 1  (values 1, 1)
    //   diff1 = increasing(1) - decreasing(1) = 1 - 1 = 0 -> exact hit, returns p1 = 1.
    //
    // The same reasoning applies to indifferencePricePoint = findIntersection(grid, goodValue, gettingExpensive):
    //   decreasing = goodValue: P(goodValueCents >= 1) = 2/2 = 1 (values 7, 1)
    //   increasing = gettingExpensive: P(gettingExpensiveCents <= 1) = 2/2 = 1 (values 1, 1)
    //   diff1 = 1 - 1 = 0 -> exact hit, returns p1 = 1.
    const result = calculateVanWestendorp([
      { tooCheapCents: 5, goodValueCents: 7, gettingExpensiveCents: 1, tooExpensiveCents: 2 },
      { tooCheapCents: 4, goodValueCents: 1, gettingExpensiveCents: 1, tooExpensiveCents: 6 },
    ]);
    expect(result.pointOfMarginalCheapness).toBe(1);
    expect(result.indifferencePricePoint).toBe(1);
    expect(result.pointOfMarginalExpensiveness).toBe(2);
    expect(result.optimalPricePoint).toBe(5);
  });
});
