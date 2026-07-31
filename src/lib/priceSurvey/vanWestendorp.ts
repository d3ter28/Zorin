export interface VanWestendorpInput {
  tooCheapCents: number;
  goodValueCents: number;
  gettingExpensiveCents: number;
  tooExpensiveCents: number;
}

export interface VanWestendorpResult {
  pointOfMarginalCheapness: number;
  pointOfMarginalExpensiveness: number;
  optimalPricePoint: number;
  indifferencePricePoint: number;
  acceptableRange: { min: number; max: number };
  responseCount: number;
  confidence: "none" | "low" | "good";
}

function confidenceTier(n: number): "none" | "low" | "good" {
  if (n < 5) return "none";
  if (n < 20) return "low";
  return "good";
}

/** Fraction of responses whose value is >= p — used for the "too cheap" and "good value" curves, which decrease as price rises. */
function cumulativeAtLeast(
  responses: VanWestendorpInput[],
  p: number,
  getValue: (r: VanWestendorpInput) => number,
): number {
  const count = responses.filter((r) => getValue(r) >= p).length;
  return count / responses.length;
}

/** Fraction of responses whose value is <= p — used for the "getting expensive" and "too expensive" curves, which increase as price rises. */
function cumulativeAtMost(
  responses: VanWestendorpInput[],
  p: number,
  getValue: (r: VanWestendorpInput) => number,
): number {
  const count = responses.filter((r) => getValue(r) <= p).length;
  return count / responses.length;
}

/**
 * Finds the price at which a decreasing curve and an increasing curve cross,
 * via linear interpolation between the two adjacent grid points that bracket
 * the sign change of (increasing - decreasing). Falls back to the grid's
 * midpoint if no crossing is found (e.g. a single response, or curves that
 * never cross within the observed price range).
 */
function findIntersection(
  grid: number[],
  decreasing: (p: number) => number,
  increasing: (p: number) => number,
): number {
  if (grid.length === 0) return 0;
  if (grid.length === 1) return grid[0];

  for (let i = 0; i < grid.length - 1; i++) {
    const p1 = grid[i];
    const p2 = grid[i + 1];
    const diff1 = increasing(p1) - decreasing(p1);
    const diff2 = increasing(p2) - decreasing(p2);

    if (diff1 === 0) return p1;
    if ((diff1 < 0 && diff2 >= 0) || (diff1 > 0 && diff2 <= 0)) {
      const t = diff1 / (diff1 - diff2);
      return Math.round(p1 + t * (p2 - p1));
    }
  }

  return Math.round((grid[0] + grid[grid.length - 1]) / 2);
}

export function calculateVanWestendorp(responses: VanWestendorpInput[]): VanWestendorpResult {
  const responseCount = responses.length;

  if (responseCount === 0) {
    return {
      pointOfMarginalCheapness: 0,
      pointOfMarginalExpensiveness: 0,
      optimalPricePoint: 0,
      indifferencePricePoint: 0,
      acceptableRange: { min: 0, max: 0 },
      responseCount: 0,
      confidence: "none",
    };
  }

  const grid = Array.from(
    new Set(
      responses.flatMap((r) => [
        r.tooCheapCents,
        r.goodValueCents,
        r.gettingExpensiveCents,
        r.tooExpensiveCents,
      ]),
    ),
  ).sort((a, b) => a - b);

  const tooCheap = (p: number) => cumulativeAtLeast(responses, p, (r) => r.tooCheapCents);
  const goodValue = (p: number) => cumulativeAtLeast(responses, p, (r) => r.goodValueCents);
  const gettingExpensive = (p: number) => cumulativeAtMost(responses, p, (r) => r.gettingExpensiveCents);
  const tooExpensive = (p: number) => cumulativeAtMost(responses, p, (r) => r.tooExpensiveCents);

  const pointOfMarginalCheapness = findIntersection(grid, tooCheap, gettingExpensive);
  const pointOfMarginalExpensiveness = findIntersection(grid, goodValue, tooExpensive);
  const optimalPricePoint = findIntersection(grid, tooCheap, tooExpensive);
  const indifferencePricePoint = findIntersection(grid, goodValue, gettingExpensive);

  return {
    pointOfMarginalCheapness,
    pointOfMarginalExpensiveness,
    optimalPricePoint,
    indifferencePricePoint,
    acceptableRange: {
      min: Math.min(pointOfMarginalCheapness, pointOfMarginalExpensiveness),
      max: Math.max(pointOfMarginalCheapness, pointOfMarginalExpensiveness),
    },
    responseCount,
    confidence: confidenceTier(responseCount),
  };
}
