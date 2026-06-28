import { describe, expect, it } from "vitest";
import { fallbackPhrasing } from "./fallback";
import type { Decision } from "../types";

const decision: Decision = {
  action: "lower",
  deltaPct: -0.1,
  suggestedPrice: 9000,
  reasons: ["You're 20% above the competitor median.", "Margin stays healthy."],
  signals: {
    marginPct: 0.4, compMedian: 9000, compMin: 8000, compMax: 11000,
    pctVsMedian: 0.2, marginFloorPrice: 6000, competitorCount: 3,
    oldestObservedAt: "2026-06-28T00:00:00.000Z",
  },
};

describe("fallbackPhrasing", () => {
  it("renders the action and joins reasons", () => {
    const text = fallbackPhrasing(decision);
    expect(text).toMatch(/lower/i);
    expect(text).toContain("competitor median");
  });
  it("uses no numbers absent from the decision reasons", () => {
    const text = fallbackPhrasing(decision);
    // 50 never appears anywhere in the decision
    expect(text).not.toContain("50");
  });
});
