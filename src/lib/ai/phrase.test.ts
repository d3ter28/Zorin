import { describe, expect, it, beforeEach } from "vitest";
import { phraseRecommendation } from "./phrase";
import type { Decision } from "../types";

const decision: Decision = {
  action: "hold",
  deltaPct: 0,
  suggestedPrice: 10000,
  reasons: ["You're competitively positioned near the market median."],
  signals: {
    marginPct: 0.4, compMedian: 10000, compMin: 9000, compMax: 11000,
    pctVsMedian: 0, marginFloorPrice: 6000, competitorCount: 3,
    oldestObservedAt: "2026-06-28T00:00:00.000Z",
  },
};

describe("phraseRecommendation", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("falls back to deterministic phrasing when no API key is set", async () => {
    const text = await phraseRecommendation(decision);
    expect(text).toMatch(/hold/i);
    expect(text).toContain("competitively positioned");
  });
});
