import { describe, expect, it } from "vitest";
import { explainLaunchPrice } from "./explainLaunchPrice";

describe("explainLaunchPrice", () => {
  it("mentions market references when competitor prices exist", () => {
    const result = explainLaunchPrice({
      minimumViablePriceCents: 2870,
      recommendedPriceCents: 3999,
      positioning: "mid-market",
      competitorPriceCount: 4,
      marketStats: {
        minCents: 2900,
        maxCents: 4900,
        medianCents: 3900,
        q1Cents: 3400,
        q3Cents: 4400,
      },
      confidence: "medium",
      readinessMode: "launch",
    });

    expect(result.headline).toContain("$39.99");
    expect(result.headline).toContain("mid-market");
    expect(result.bullets).toContain(
      "Your minimum viable price is $28.70 after product cost, fulfillment, and fees."
    );
    expect(result.bullets).toContain(
      "You supplied 4 competitor prices, giving this launch a medium-confidence market reference."
    );
    expect(result.bullets.join(" ")).toContain("market median");
  });

  it("asks for competitor prices when none exist", () => {
    const result = explainLaunchPrice({
      minimumViablePriceCents: 2870,
      recommendedPriceCents: 3599,
      positioning: "premium",
      competitorPriceCount: 0,
      marketStats: null,
      confidence: "low",
      readinessMode: "launch",
    });

    expect(result.headline).toContain("no market references");
    expect(result.bullets).toContain(
      "Add competitor prices to improve confidence before committing inventory or ad spend."
    );
  });

  it("mentions historical optimization when readiness mode is optimization", () => {
    const result = explainLaunchPrice({
      minimumViablePriceCents: 2870,
      recommendedPriceCents: 3999,
      positioning: "mid-market",
      competitorPriceCount: 3,
      marketStats: {
        minCents: 2900,
        maxCents: 4900,
        medianCents: 3900,
        q1Cents: 3400,
        q3Cents: 4400,
      },
      confidence: "medium",
      readinessMode: "optimization",
    });

    expect(result.bullets).toContain(
      "This product has enough sales history for demand-aware recommendations, so treat Launch Planner as a margin guardrail."
    );
  });
});
