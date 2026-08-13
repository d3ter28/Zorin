import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProfitTrendChart } from "./ProfitTrendChart";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockTrend(points: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => points })) as unknown as typeof fetch);
}

describe("ProfitTrendChart", () => {
  it("renders the three-series legend when there are >=2 points", async () => {
    mockTrend([
      { month: "2026-01", revenueCents: 100000, cogsCents: 70000, grossProfitCents: 30000, estimated: false },
      { month: "2026-02", revenueCents: 120000, cogsCents: 78000, grossProfitCents: 42000, estimated: false },
    ]);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/Gross profit/i)).toBeInTheDocument());
    expect(screen.getByText(/Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/COGS/i)).toBeInTheDocument();
  });

  it("shows an estimated note when any point is estimated", async () => {
    mockTrend([
      { month: "2026-01", revenueCents: 100000, cogsCents: 70000, grossProfitCents: 30000, estimated: true },
      { month: "2026-02", revenueCents: 120000, cogsCents: 78000, grossProfitCents: 42000, estimated: false },
    ]);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/estimated from current costs/i)).toBeInTheDocument());
  });

  it("shows an empty state with fewer than 2 points", async () => {
    mockTrend([]);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/add cogs and sync sales/i)).toBeInTheDocument());
  });

  it("shows the empty state when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network error"); }) as unknown as typeof fetch);
    render(<ProfitTrendChart />);
    await waitFor(() => expect(screen.getByText(/add cogs and sync sales/i)).toBeInTheDocument());
  });
});
