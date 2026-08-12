import { describe, expect, it } from "vitest";
import {
  cogsInEffectOn,
  monthlyPnL,
  productProfit,
  windowProfitForProducts,
  type CogsChangeRow,
  type SalesRow,
} from "./computeProfit";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("cogsInEffectOn", () => {
  const changes: CogsChangeRow[] = [
    { toCents: 1000, changedAt: d("2026-01-01") },
    { toCents: 1500, changedAt: d("2026-06-01") },
  ];

  it("returns the change in effect at the date (not estimated)", () => {
    expect(cogsInEffectOn(changes, 2000, d("2026-03-01"))).toEqual({ cogsCents: 1000, estimated: false });
    expect(cogsInEffectOn(changes, 2000, d("2026-07-01"))).toEqual({ cogsCents: 1500, estimated: false });
  });

  it("falls back to current cogs (estimated) when date predates all changes", () => {
    expect(cogsInEffectOn(changes, 2000, d("2025-12-01"))).toEqual({ cogsCents: 2000, estimated: true });
  });

  it("falls back (estimated) when there are no changes at all", () => {
    expect(cogsInEffectOn([], 2000, d("2026-03-01"))).toEqual({ cogsCents: 2000, estimated: true });
  });

  it("returns null cogs when no changes and current cogs is null", () => {
    expect(cogsInEffectOn([], null, d("2026-03-01"))).toEqual({ cogsCents: null, estimated: true });
  });

  it("is order-independent (sorts defensively)", () => {
    const unsorted: CogsChangeRow[] = [
      { toCents: 1500, changedAt: d("2026-06-01") },
      { toCents: 1000, changedAt: d("2026-01-01") },
    ];
    expect(cogsInEffectOn(unsorted, 2000, d("2026-03-01"))).toEqual({ cogsCents: 1000, estimated: false });
  });

  it("applies a change whose changedAt equals the sale date (same-day boundary)", () => {
    const result = cogsInEffectOn([{ toCents: 1500, changedAt: d("2026-03-01") }], 2000, d("2026-03-01"));
    expect(result).toEqual({ cogsCents: 1500, estimated: false });
  });
});

describe("monthlyPnL", () => {
  const now = d("2026-03-15");
  const changesByProduct = new Map<string, CogsChangeRow[]>([["p1", [{ toCents: 400, changedAt: d("2026-01-01") }]]]);
  const currentCogs = new Map<string, number | null>([["p1", 400]]);

  it("buckets revenue, cogs and gross profit by month", () => {
    const sales: SalesRow[] = [
      { productId: "p1", date: d("2026-02-10"), unitsSold: 3, priceCents: 1000 },
      { productId: "p1", date: d("2026-02-20"), unitsSold: 2, priceCents: 1000 },
    ];
    const out = monthlyPnL(sales, changesByProduct, currentCogs, 24, now);
    const feb = out.find((b) => b.month === "2026-02")!;
    expect(feb.revenueCents).toBe(5000);
    expect(feb.cogsCents).toBe(2000);
    expect(feb.grossProfitCents).toBe(3000);
    expect(feb.estimated).toBe(false);
  });

  it("marks a month estimated when a row fell back to current cogs", () => {
    const sales: SalesRow[] = [{ productId: "p1", date: d("2025-12-10"), unitsSold: 1, priceCents: 1000 }];
    const out = monthlyPnL(sales, changesByProduct, currentCogs, 24, now);
    const dec = out.find((b) => b.month === "2025-12")!;
    expect(dec.estimated).toBe(true);
    expect(dec.grossProfitCents).toBe(600);
  });

  it("excludes rows for products with no cogs data", () => {
    const sales: SalesRow[] = [{ productId: "pX", date: d("2026-02-10"), unitsSold: 5, priceCents: 1000 }];
    const out = monthlyPnL(sales, new Map(), new Map([["pX", null]]), 24, now);
    const feb = out.find((b) => b.month === "2026-02");
    expect(feb).toBeUndefined();
  });

  it("excludes rows older than the months window", () => {
    // now = 2026-03-15, months = 24 → cutoff = 2024-04-01
    // A row dated 2024-03-15 is before the cutoff and must not appear
    const sales: SalesRow[] = [{ productId: "p1", date: d("2024-03-15"), unitsSold: 10, priceCents: 1000 }];
    const out = monthlyPnL(sales, changesByProduct, currentCogs, 24, now);
    expect(out.find((b) => b.month === "2024-03")).toBeUndefined();
  });
});

describe("productProfit", () => {
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  const currentCogs = new Map<string, number | null>([["p1", 400], ["p2", null]]);

  it("sums per product and computes revenue-weighted margin", () => {
    const sales: SalesRow[] = [
      { productId: "p1", date: d("2026-02-10"), unitsSold: 10, priceCents: 1000 },
    ];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    const p1 = out.find((p) => p.productId === "p1")!;
    expect(p1.revenueCents).toBe(10000);
    expect(p1.grossProfitCents).toBe(6000);
    expect(p1.marginPct).toBeCloseTo(0.6, 5);
    expect(p1.estimated).toBe(true);
  });

  it("omits products with null cogs", () => {
    const sales: SalesRow[] = [{ productId: "p2", date: d("2026-02-10"), unitsSold: 5, priceCents: 1000 }];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    expect(out.find((p) => p.productId === "p2")).toBeUndefined();
  });

  it("excludes sales outside the window", () => {
    const sales: SalesRow[] = [{ productId: "p1", date: d("2026-05-10"), unitsSold: 5, priceCents: 1000 }];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    expect(out).toHaveLength(0);
  });

  it("produces negative grossProfitCents and null marginPct for a zero-price row", () => {
    const sales: SalesRow[] = [{ productId: "p1", date: d("2026-02-10"), unitsSold: 5, priceCents: 0 }];
    const out = productProfit(sales, changesByProduct, currentCogs, d("2026-02-01"), d("2026-03-01"));
    const p1 = out.find((p) => p.productId === "p1")!;
    expect(p1.revenueCents).toBe(0);
    expect(p1.grossProfitCents).toBe(-2000); // 0 revenue - 5 * 400 cost
    expect(p1.marginPct).toBeNull();
  });
});

describe("windowProfitForProducts", () => {
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  const currentCogs = new Map<string, number | null>([["p1", 400]]);

  it("sums only the given products within [start, end)", () => {
    const sales: SalesRow[] = [
      { productId: "p1", date: d("2026-02-10"), unitsSold: 4, priceCents: 1000 },
      { productId: "p9", date: d("2026-02-10"), unitsSold: 99, priceCents: 1000 },
    ];
    const w = windowProfitForProducts(sales, changesByProduct, currentCogs, ["p1"], d("2026-02-01"), d("2026-03-01"));
    expect(w.grossProfitCents).toBe(2400);
    expect(w.hasSales).toBe(true);
  });

  it("reports hasSales false and zero profit for an empty window", () => {
    const w = windowProfitForProducts([], changesByProduct, currentCogs, ["p1"], d("2026-02-01"), d("2026-03-01"));
    expect(w).toEqual({ grossProfitCents: 0, revenueCents: 0, units: 0, estimated: false, hasSales: false });
  });
});
