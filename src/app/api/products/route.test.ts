import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { product: { findMany } },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
  })),
}));

import { GET } from "./route";

beforeEach(() => {
  findMany.mockReset();
});

describe("GET /api/products", () => {
  it("includes a fresh recommendedAction and suggestedPrice per row", async () => {
    findMany.mockResolvedValue([
      {
        id: "p1",
        title: "Underpriced",
        sku: "U-1",
        currentPrice: 8000,
        cogs: 4000,
        category: "x",
        estUnits: 10,
        competitors: [
          { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
          { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        ],
        recommendation: null,
      },
    ]);

    const res = await GET();
    const rows = await res.json();

    expect(rows[0]).toMatchObject({
      id: "p1",
      recommendedAction: "raise",
      suggestedPrice: 10000,
    });
  });

  it("reports hold with the current price when there is no competitor data", async () => {
    findMany.mockResolvedValue([
      {
        id: "p2",
        title: "No comps",
        sku: "N-1",
        currentPrice: 5000,
        cogs: 2000,
        category: "x",
        estUnits: null,
        competitors: [],
        recommendation: null,
      },
    ]);

    const res = await GET();
    const rows = await res.json();

    expect(rows[0]).toMatchObject({
      recommendedAction: "hold",
      suggestedPrice: 5000,
    });
  });

  it("excludes stale competitors from the displayed comparison", async () => {
    findMany.mockResolvedValue([
      {
        id: "p3",
        title: "Mixed staleness",
        sku: "M-1",
        currentPrice: 10000,
        cogs: 4000,
        category: "x",
        estUnits: 10,
        competitors: [
          { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z"), isStale: false },
          { price: 2000, observedAt: new Date("2026-01-01T00:00:00.000Z"), isStale: true },
        ],
        recommendation: null,
      },
    ]);

    const res = await GET();
    const rows = await res.json();

    // The stale $20 competitor must not drag the displayed median/min down: only
    // the fresh $100 competitor should count, matching what the recommendation uses.
    expect(rows[0].comparison.competitorCount).toBe(1);
    expect(rows[0].comparison.compMedian).toBe(10000);
    expect(rows[0].comparison.compMin).toBe(10000);
  });
});
