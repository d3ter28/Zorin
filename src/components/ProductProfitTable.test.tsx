import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProductProfitTable } from "./ProductProfitTable";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const rows = [
  { productId: "p1", title: "Alpha", sku: "A-1", units: 100, revenueCents: 100000, cogsCents: 60000, grossProfitCents: 40000, marginPct: 0.4, estimated: false },
  { productId: "p2", title: "Gamma", sku: "G-1", units: 200, revenueCents: 100000, cogsCents: 91000, grossProfitCents: 9000, marginPct: 0.09, estimated: true },
];

describe("ProductProfitTable", () => {
  it("renders product rows with profit and margin", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ window: 90, products: rows }) })) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("$400.00")).toBeInTheDocument(); // Alpha gross profit
    expect(screen.getByText(/9%/)).toBeInTheDocument();       // Gamma margin (0.09 * 100 = 9)
  });

  it("shows an empty state when there are no products", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ window: 90, products: [] }) })) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText(/no product profit data/i)).toBeInTheDocument());
  });

  it("shows the 'est.' marker and 'below floor' for estimated, low-margin rows", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ window: 90, products: rows }) })) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText("Gamma")).toBeInTheDocument());
    expect(screen.getByText("est.")).toBeInTheDocument(); // Gamma has estimated: true
    expect(screen.getByText(/below floor/i)).toBeInTheDocument(); // Gamma has marginPct: 0.09 < 0.15
  });

  it("shows '—' for null marginPct", async () => {
    const withNullMargin = [
      { ...rows[0], marginPct: null },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ window: 90, products: withNullMargin }) })) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty state when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }) as unknown as typeof fetch);
    render(<ProductProfitTable />);
    await waitFor(() => expect(screen.getByText(/no product profit data/i)).toBeInTheDocument());
  });
});
