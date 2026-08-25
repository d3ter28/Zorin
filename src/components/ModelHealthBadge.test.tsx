import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ModelHealthBadge } from "./ModelHealthBadge";

afterEach(cleanup);

describe("ModelHealthBadge", () => {
  it("strong: high r2/points shows Strong fit", () => {
    render(<ModelHealthBadge r2={0.9} dataPoints={40} />);
    expect(screen.getByText(/Strong fit/)).toBeTruthy();
  });

  it("none: null r2/dataPoints shows No model", () => {
    render(<ModelHealthBadge r2={null} dataPoints={null} />);
    expect(screen.getByText("No model")).toBeTruthy();
  });

  it("isFallback: shows Estimated tier even with a high r2/confidenceScore", () => {
    render(<ModelHealthBadge r2={0.95} dataPoints={50} confidenceScore={0.9} isFallback />);
    expect(screen.getByText(/Estimated/)).toBeTruthy();
    expect(screen.queryByText(/Strong/)).toBeNull();
  });

  it("isFallback: shows Estimated tier even with null r2/dataPoints", () => {
    render(<ModelHealthBadge r2={null} dataPoints={null} isFallback />);
    expect(screen.getByText(/Estimated/)).toBeTruthy();
    expect(screen.queryByText("No model")).toBeNull();
  });

  it("isFallback: uses accent color tokens distinct from the other tiers", () => {
    render(<ModelHealthBadge r2={0.9} dataPoints={40} isFallback />);
    const badge = screen.getByText(/Estimated/);
    expect(badge.className).toContain("text-accent");
    expect(badge.className).toContain("bg-accent-soft");
  });

  it("isFallback: tooltip clarifies this is a borrowed estimate, not a real fit", () => {
    render(<ModelHealthBadge r2={0.9} dataPoints={40} isFallback />);
    const badge = screen.getByText(/Estimated/);
    expect(badge.getAttribute("title")).toMatch(/similar products|not this SKU/i);
  });

  it("isFallback false/absent: unchanged behavior", () => {
    render(<ModelHealthBadge r2={0.82} dataPoints={12} />);
    expect(screen.getByText(/Fair fit/)).toBeTruthy();
  });
});
