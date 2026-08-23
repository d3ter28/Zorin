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
});
