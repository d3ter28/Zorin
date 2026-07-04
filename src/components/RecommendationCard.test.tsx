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
  it("loading: renders skeleton and upload prompt", () => {
    render(<RecommendationCard rec={null} />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByText("raise")).toBeNull();
    expect(screen.queryByText("lower")).toBeNull();
    expect(screen.queryByText("hold")).toBeNull();
    expect(screen.getByText("Upload sales history to generate a recommendation.")).toBeTruthy();
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

  it("model quality line: shows R² and data points", () => {
    render(<RecommendationCard rec={rec({ r2: 0.82, dataPoints: 12 })} />);
    expect(screen.getByText("Model quality: R²=0.82, 12 data points")).toBeTruthy();
  });

  it("reasoning text is rendered", () => {
    render(<RecommendationCard rec={rec({ reasoning: "Lower your price to match the market." })} />);
    expect(screen.getByText("Lower your price to match the market.")).toBeTruthy();
  });
});
