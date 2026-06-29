import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { product: { findMany } },
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
});
