import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecommendationCard } from "./RecommendationCard";
import type { RecView } from "./RecommendationCard";

afterEach(cleanup);

function rec(overrides: Partial<RecView> = {}): RecView {
  return {
    action: "hold",
    suggestedPrice: 1500,
    phrasing: "You are competitively positioned.",
    competitorCount: 3,
    ...overrides,
  };
}

describe("RecommendationCard", () => {
  it("loading: renders skeleton, no action badge", () => {
    render(<RecommendationCard rec={null} />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
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

  it("freshness: plural competitors", () => {
    render(<RecommendationCard rec={rec({ competitorCount: 3 })} />);
    expect(screen.getByText("Based on 3 competitors")).toBeTruthy();
  });

  it("freshness: singular competitor", () => {
    render(<RecommendationCard rec={rec({ competitorCount: 1 })} />);
    expect(screen.getByText("Based on 1 competitor")).toBeTruthy();
  });

  it("freshness: no competitor data", () => {
    render(<RecommendationCard rec={rec({ competitorCount: 0 })} />);
    expect(screen.getByText("No competitor data")).toBeTruthy();
  });

  it("phrasing text is rendered", () => {
    render(<RecommendationCard rec={rec({ phrasing: "Lower your price to match the market." })} />);
    expect(screen.getByText("Lower your price to match the market.")).toBeTruthy();
  });
});
