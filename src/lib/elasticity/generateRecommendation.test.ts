import { describe, it, expect } from "vitest";
import { generateRecommendation } from "./generateRecommendation";

const model = { elasticity: -0.5, intercept: 10.0, r2: 0.85, dataPoints: 12 };

describe("generateRecommendation", () => {
  it("recommends raise when inelastic", () => {
    // With elasticity -0.5 (inelastic), raising price grows revenue
    const rec = generateRecommendation(model, 1000, 400, 0.1);
    expect(rec.action).toBe("raise");
    expect(rec.suggestedPriceCents).toBeGreaterThan(1000);
  });

  it("returns hold when current price is already profit-maximizing", () => {
    // For the log-linear model Q = exp(a + e*ln(P)), profit = Q*(P-C).
    // The first-order condition gives optimal P = C * e/(e+1).
    // With e=-2, C=500: optimal P = 500*(-2)/(-2+1) = 1000.
    const elasticModel = { ...model, elasticity: -2.0 };
    const rec = generateRecommendation(elasticModel, 1000, 500, 0.0);
    expect(rec.action).toBe("hold");
  });

  it("reasoning contains elasticity value", () => {
    const rec = generateRecommendation(model, 1000, 400, 0.1);
    expect(rec.reasoning).toMatch(/-0\.[0-9]/);
  });

  it("does not suggest price below margin floor", () => {
    const rec = generateRecommendation(model, 1000, 800, 0.15);
    // COGS=800, floor=15% → min price = 800/(1-0.15) ≈ 941
    expect(rec.suggestedPriceCents).toBeGreaterThanOrEqual(941);
  });

  it("deltaPct reflects price change", () => {
    const rec = generateRecommendation(model, 1000, 400, 0.1);
    const expectedDelta = (rec.suggestedPriceCents - 1000) / 1000;
    expect(rec.deltaPct).toBeCloseTo(expectedDelta, 3);
  });

  it("uses narrower scan range at low confidence", () => {
    // With confidence=0, scan is ±10%. With confidence=1, scan is ±30%.
    // At current price 1000 with confidence=0, suggestedPrice should stay within ±10%.
    const highlyElastic = { elasticity: -3.0, intercept: 15, r2: 0.9, dataPoints: 5 };
    const recLowConf  = generateRecommendation(highlyElastic, 1000, 200, 0.1, 0.0);
    const recHighConf = generateRecommendation(highlyElastic, 1000, 200, 0.1, 1.0);

    // Low confidence: suggested price within ±10% of 1000
    expect(recLowConf.suggestedPriceCents).toBeGreaterThanOrEqual(900);
    expect(recLowConf.suggestedPriceCents).toBeLessThanOrEqual(1100);

    // High confidence: can suggest up to ±30% — delta magnitude should be larger (or equal)
    expect(Math.abs(recHighConf.deltaPct)).toBeGreaterThanOrEqual(Math.abs(recLowConf.deltaPct));
  });

  it("appends low-confidence note to reasoning when confidenceScore < 0.4", () => {
    const model = { elasticity: -0.5, intercept: 10.0, r2: 0.85, dataPoints: 12 };
    const rec = generateRecommendation(model, 1000, 400, 0.1, 0.2);
    expect(rec.reasoning).toMatch(/limited data/i);
  });

  it("does not append confidence note at high confidence", () => {
    const model = { elasticity: -0.5, intercept: 10.0, r2: 0.85, dataPoints: 12 };
    const rec = generateRecommendation(model, 1000, 400, 0.1, 0.9);
    expect(rec.reasoning).not.toMatch(/limited data/i);
  });
});
