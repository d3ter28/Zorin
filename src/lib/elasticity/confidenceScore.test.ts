import { describe, it, expect } from "vitest";
import { computeConfidenceScore } from "./confidenceScore";

describe("computeConfidenceScore", () => {
  it("returns 1.0 at perfect r² and sufficient data", () => {
    expect(computeConfidenceScore(1.0, 20)).toBe(1.0);
    expect(computeConfidenceScore(1.0, 50)).toBe(1.0);
  });

  it("returns 0 when r² is 0", () => {
    expect(computeConfidenceScore(0, 100)).toBe(0);
  });

  it("scales with data sufficiency below 20 effective samples", () => {
    // r²=1.0, 10 samples → 1.0 * (10/20) = 0.5
    expect(computeConfidenceScore(1.0, 10)).toBeCloseTo(0.5);
  });

  it("scales with r²", () => {
    // r²=0.5, 20 samples → 0.5 * 1.0 = 0.5
    expect(computeConfidenceScore(0.5, 20)).toBeCloseTo(0.5);
  });

  it("result is always in [0, 1]", () => {
    expect(computeConfidenceScore(1.5, 100)).toBe(1.0); // clamp above 1
    expect(computeConfidenceScore(-0.1, 5)).toBe(0);    // clamp below 0
  });
});
