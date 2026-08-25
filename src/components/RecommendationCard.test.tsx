import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecommendationCard } from "./RecommendationCard";
import type { MLRecView } from "./RecommendationCard";

afterEach(cleanup);

function rec(overrides: Partial<MLRecView> = {}): MLRecView {
  return {
    action: "hold",
    suggestedPriceCents: 1500,
    reasoning: "You are competitively positioned.",
    r2: 0.82,
    dataPoints: 12,
    expectedProfitLiftPct: 0.05,
    ...overrides,
  };
}

describe("RecommendationCard", () => {
  it("loading: renders empty state when rec is null", () => {
    render(<RecommendationCard rec={null} />);
    expect(screen.getByText("No recommendation yet")).toBeTruthy();
    expect(screen.queryByText("raise")).toBeNull();
    expect(screen.queryByText("lower")).toBeNull();
    expect(screen.queryByText("hold")).toBeNull();
  });

  it("raise: badge text and text-positive class", () => {
    render(<RecommendationCard rec={rec({ action: "raise" })} />);
    const badge = screen.getByText("raise");
    expect(badge.className).toContain("text-positive");
  });

  it("lower: badge text and text-warning class", () => {
    render(<RecommendationCard rec={rec({ action: "lower" })} />);
    const badge = screen.getByText("lower");
    expect(badge.className).toContain("text-warning");
  });

  it("hold: badge text and text-muted class", () => {
    render(<RecommendationCard rec={rec({ action: "hold" })} />);
    const badge = screen.getByText("hold");
    expect(badge.className).toContain("text-muted");
  });

  it("positive profit lift: shows +N% expected profit lift", () => {
    render(<RecommendationCard rec={rec({ expectedProfitLiftPct: 0.05 })} />);
    expect(screen.getByText("+5.0% expected profit lift")).toBeTruthy();
  });

  it("negative profit change: shows N% expected profit change", () => {
    render(<RecommendationCard rec={rec({ expectedProfitLiftPct: -0.03 })} />);
    expect(screen.getByText("-3.0% expected profit change")).toBeTruthy();
  });

  it("model health badge: shows tier label and raw stats in title", () => {
    render(<RecommendationCard rec={rec({ r2: 0.82, dataPoints: 12 })} />);
    expect(screen.getByText(/Fair fit/)).toBeTruthy();
    expect(screen.getByTitle("R²=0.82, 12 data points")).toBeTruthy();
  });

  it("reasoning text is rendered", () => {
    render(<RecommendationCard rec={rec({ reasoning: "Lower your price to match the market." })} />);
    expect(screen.getByText("Lower your price to match the market.")).toBeTruthy();
  });

  it("why this price: omitted when currentPriceCents is not passed", () => {
    render(
      <RecommendationCard
        rec={rec({
          action: "raise",
          currentUnitsEstimate: 58,
          projectedUnitsEstimate: 42,
          currentProfitCents: 100000,
          projectedProfitCents: 118300,
          profitLiftCents: 18300,
        })}
      />
    );
    expect(screen.queryByText("Why this price?")).toBeNull();
  });

  it("why this price: omitted when the recommendation lacks unit/profit data", () => {
    render(<RecommendationCard rec={rec({ action: "raise" })} currentPriceCents={7999} />);
    expect(screen.queryByText("Why this price?")).toBeNull();
  });

  it("why this price: raise shows current vs projected units/profit and a profit gain", () => {
    render(
      <RecommendationCard
        rec={rec({
          action: "raise",
          suggestedPriceCents: 8999,
          currentUnitsEstimate: 58,
          projectedUnitsEstimate: 42,
          currentProfitCents: 100000,
          projectedProfitCents: 118300,
          profitLiftCents: 18300,
        })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText("Why this price?")).toBeTruthy();
    expect(screen.getByText(/~58 units/)).toBeTruthy();
    expect(screen.getByText(/~42 units/)).toBeTruthy();
    expect(screen.getByText("+$183.00 projected monthly gross profit gain")).toBeTruthy();
  });

  it("why this price: negative lift shows a profit change, not a gain", () => {
    render(
      <RecommendationCard
        rec={rec({
          action: "lower",
          suggestedPriceCents: 6999,
          currentUnitsEstimate: 42,
          projectedUnitsEstimate: 58,
          currentProfitCents: 118300,
          projectedProfitCents: 100000,
          profitLiftCents: -18300,
        })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText("-$183.00 projected monthly gross profit change")).toBeTruthy();
  });

  it("why this price: hold shows only the current-price stat, no lift line", () => {
    render(
      <RecommendationCard
        rec={rec({
          action: "hold",
          currentUnitsEstimate: 50,
          projectedUnitsEstimate: 50,
          currentProfitCents: 110000,
          projectedProfitCents: 110000,
          profitLiftCents: 0,
        })}
        currentPriceCents={7999}
      />
    );
    expect(screen.getByText(/already close to the profit-maximizing price/)).toBeTruthy();
    expect(screen.queryByText(/projected monthly gross profit/)).toBeNull();
  });

  describe("fallback recommendations", () => {
    it("category fallback: shows category-specific reasoning text", () => {
      render(
        <RecommendationCard
          rec={rec({
            fallbackLevel: "category",
            fallbackCategoryName: "Skincare",
            fallbackSourceCount: 3,
          })}
        />
      );
      expect(
        screen.getByText("Estimated from your Skincare category (3 similar products)")
      ).toBeTruthy();
    });

    it("catalog fallback: shows catalog-specific reasoning text", () => {
      render(
        <RecommendationCard
          rec={rec({
            fallbackLevel: "catalog",
            fallbackSourceCount: 25,
          })}
        />
      );
      expect(
        screen.getByText("Estimated from your whole catalog (25 products)")
      ).toBeTruthy();
    });

    it("global fallback: shows global-specific reasoning text", () => {
      render(<RecommendationCard rec={rec({ fallbackLevel: "global" })} />);
      expect(
        screen.getByText("Estimated from typical retail elasticity (no comparable products yet)")
      ).toBeTruthy();
    });

    it("fallback: badge receives isFallback and shows Estimated tier regardless of r2", () => {
      render(
        <RecommendationCard
          rec={rec({ fallbackLevel: "category", fallbackCategoryName: "Widgets", fallbackSourceCount: 2, r2: 0.95, dataPoints: 50 })}
        />
      );
      expect(screen.getByTitle(/similar products/i)).toBeTruthy();
    });

    it("fallback: renders secondary suggestions with Van Westendorp link and price test copy", () => {
      render(
        <RecommendationCard
          rec={rec({ fallbackLevel: "catalog", fallbackSourceCount: 10 })}
        />
      );
      const surveyLink = screen.getByText(/Create a Van Westendorp survey/);
      expect(surveyLink).toBeTruthy();
      expect(surveyLink.closest("a")?.getAttribute("href")).toBe("#van-westendorp-survey");
      expect(screen.getByText(/run a 2-week price test to get a real reading/)).toBeTruthy();
    });

    it("non-fallback: does not render secondary suggestions", () => {
      render(<RecommendationCard rec={rec()} />);
      expect(screen.queryByText(/Van Westendorp survey/)).toBeNull();
      expect(screen.queryByText(/price test/)).toBeNull();
    });

    it("non-fallback: rendering is unchanged (original reasoning text shown, no Estimated tier)", () => {
      render(<RecommendationCard rec={rec({ reasoning: "You are competitively positioned.", r2: 0.82, dataPoints: 12 })} />);
      expect(screen.getByText("You are competitively positioned.")).toBeTruthy();
      expect(screen.getByText(/Fair fit/)).toBeTruthy();
      expect(screen.queryByText(/Estimated/)).toBeNull();
    });
  });
});
