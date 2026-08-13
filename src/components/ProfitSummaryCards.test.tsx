import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProfitSummaryCards } from "./ProfitSummaryCards";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockTrend(points: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => points })) as unknown as typeof fetch);
}

describe("ProfitSummaryCards", () => {
  it("shows latest-month gross profit and MoM delta", async () => {
    mockTrend([
      { month: "2026-01", revenueCents: 100000, cogsCents: 70000, grossProfitCents: 30000, estimated: false },
      { month: "2026-02", revenueCents: 120000, cogsCents: 78000, grossProfitCents: 42000, estimated: false },
    ]);
    render(<ProfitSummaryCards />);
    await waitFor(() => expect(screen.getByText("$420.00")).toBeInTheDocument()); // gross profit Feb
    expect(screen.getByText(/40\.0%/)).toBeInTheDocument(); // MoM (42000-30000)/30000
  });

  it("shows an empty state when there is no data", async () => {
    mockTrend([]);
    render(<ProfitSummaryCards />);
    await waitFor(() => expect(screen.getByText(/no profit data yet/i)).toBeInTheDocument());
  });
});
