import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findMany },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "test@example.com", merchantId: "m1" },
  })),
}));

import { GET } from "./route";

const req = () => ({}) as unknown as Request;

const qualifyingProduct = {
  id: "p1",
  merchantId: "m1",
  title: "Widget",
  sku: "SKU-001",
  currentPrice: 10000,
  cogs: 4000,
  estUnits: 50,
  category: "test",
  elasticityModel: {
    elasticity: -1.5,
    intercept: 8.0,
    r2: 0.8,
    dataPoints: 20,
    confidenceScore: 0.7,
  },
  recommendation: {
    action: "lower",
    phrasing: "lower price",
    rulesJson: JSON.stringify({
      suggestedPriceCents: 9500,
      expectedProfitLiftPct: 0.10,
      r2: 0.8,
      dataPoints: 20,
    }),
  },
  priceChanges: [],
};

beforeEach(() => {
  findMany.mockReset();
});

describe("GET /api/products/portfolio — profitOpportunityCents", () => {
  it("returns profitOpportunityCents > 0 when a qualifying product exists", async () => {
    findMany.mockResolvedValue([qualifyingProduct]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.profitOpportunityCents).toBe("number");
    expect(body.profitOpportunityCents).toBeCloseTo(1.79, 1);
  });

  it("returns 0 when product has null cogs", async () => {
    findMany.mockResolvedValue([{ ...qualifyingProduct, cogs: null }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });

  it("returns 0 when recommendation action is hold", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      recommendation: {
        action: "hold",
        phrasing: "hold",
        rulesJson: JSON.stringify({ suggestedPriceCents: 10000, expectedProfitLiftPct: 0, r2: 0.8, dataPoints: 20 }),
      },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });

  it("returns 0 when product has no elasticity model and no fallback recommendation", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      elasticityModel: null,
      recommendation: {
        action: "lower",
        phrasing: "lower price",
        // No fallbackLevel — this is a product with neither a real fit nor a
        // fallback-sourced recommendation (shouldn't normally happen, but
        // must not be counted either way).
        rulesJson: JSON.stringify({ suggestedPriceCents: 9500, expectedProfitLiftPct: 0.10 }),
      },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });

  it("skips product with unparseable rulesJson without throwing", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      recommendation: { action: "lower", phrasing: "lower", rulesJson: "not-json" },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.profitOpportunityCents).toBe(0);
  });

  it("counts a fallback-sourced recommendation using its persisted currentProfitCents", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      elasticityModel: null,
      recommendation: {
        action: "raise",
        phrasing: "raise price",
        rulesJson: JSON.stringify({
          suggestedPriceCents: 10800,
          expectedProfitLiftPct: 0.10,
          currentProfitCents: 500,
          fallbackLevel: "category",
          fallbackCategoryName: "Widgets",
          fallbackSourceCount: 4,
        }),
      },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBeCloseTo(50, 1); // 500 * 0.10
  });

  it("does not count a fallback recommendation with a non-positive currentProfitCents", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      elasticityModel: null,
      recommendation: {
        action: "raise",
        phrasing: "raise price",
        rulesJson: JSON.stringify({
          suggestedPriceCents: 10800,
          expectedProfitLiftPct: 0.10,
          currentProfitCents: 0,
          fallbackLevel: "global",
        }),
      },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.profitOpportunityCents).toBe(0);
  });
});

describe("GET /api/products/portfolio — modelHealth", () => {
  it("counts a real model into strong/fair/weak per the existing thresholds", async () => {
    findMany.mockResolvedValue([qualifyingProduct]); // r2 0.8, dataPoints 20 -> fair

    const res = await GET(req());
    const body = await res.json();

    expect(body.modelHealth).toEqual({ strong: 0, fair: 1, weak: 0, estimated: 0, none: 0 });
  });

  it("counts a fallback-sourced recommendation as estimated, not none", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      elasticityModel: null,
      recommendation: {
        action: "raise",
        phrasing: "raise price",
        rulesJson: JSON.stringify({
          suggestedPriceCents: 10800,
          expectedProfitLiftPct: 0.10,
          fallbackLevel: "catalog",
          fallbackSourceCount: 6,
        }),
      },
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.modelHealth).toEqual({ strong: 0, fair: 0, weak: 0, estimated: 1, none: 0 });
  });

  it("counts a product with no model and no recommendation at all as none", async () => {
    findMany.mockResolvedValue([{
      ...qualifyingProduct,
      elasticityModel: null,
      recommendation: null,
    }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.modelHealth).toEqual({ strong: 0, fair: 0, weak: 0, estimated: 0, none: 1 });
  });
});
