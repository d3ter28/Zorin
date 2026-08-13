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
});
