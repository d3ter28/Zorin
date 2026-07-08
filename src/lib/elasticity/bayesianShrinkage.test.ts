import { describe, it, expect } from "vitest";
import { bayesianShrinkage } from "./bayesianShrinkage";

describe("bayesianShrinkage", () => {
  const PRIOR = -1.2;
  const K = 5; // priorStrength

  it("returns prior when effectiveSampleSize is 0", () => {
    const { shrunkElasticity, priorApplied } = bayesianShrinkage(0, 0);
    expect(shrunkElasticity).toBeCloseTo(PRIOR);
    expect(priorApplied).toBe(true);
  });

  it("returns midpoint when effectiveSampleSize equals priorStrength", () => {
    // weight = 5/(5+5) = 0.5 → midpoint
    const { shrunkElasticity } = bayesianShrinkage(-3.0, K, PRIOR, K);
    expect(shrunkElasticity).toBeCloseTo(0.5 * (-3.0) + 0.5 * PRIOR);
  });

  it("approaches raw elasticity as effectiveSampleSize grows", () => {
    const { shrunkElasticity } = bayesianShrinkage(-2.5, 500, PRIOR, K);
    expect(shrunkElasticity).toBeCloseTo(-2.5, 1);
  });

  it("priorApplied is true whenever shrinkage is non-zero", () => {
    const { priorApplied } = bayesianShrinkage(-1.5, 10, PRIOR, K);
    expect(priorApplied).toBe(true);
  });

  it("shrinkage never produces values outside [elasticity, prior] range", () => {
    const { shrunkElasticity } = bayesianShrinkage(-3.0, 7, PRIOR, K);
    expect(shrunkElasticity).toBeGreaterThanOrEqual(-3.0);
    expect(shrunkElasticity).toBeLessThanOrEqual(PRIOR); // prior is less negative
  });
});
