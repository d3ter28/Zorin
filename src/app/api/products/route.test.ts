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

const baseProduct = {
  id: "p1",
  title: "Widget",
  sku: "SKU-001",
  currentPrice: 10000,
  cogs: 4000,
  category: "Widgets",
  estUnits: 50,
  imageUrl: null,
  elasticityModel: null,
  recommendation: null,
};

beforeEach(() => {
  findMany.mockReset();
});

describe("GET /api/products", () => {
  it("marks a real per-SKU model as isFallback: false", async () => {
    findMany.mockResolvedValue([
      {
        ...baseProduct,
        elasticityModel: { r2: 0.8, dataPoints: 20, confidenceScore: 0.7 },
        recommendation: {
          action: "lower",
          rulesJson: JSON.stringify({ suggestedPriceCents: 9500 }),
        },
      },
    ]);

    const res = await GET(req());
    const body = await res.json();

    expect(body[0].isFallback).toBe(false);
    expect(body[0].modelHealth).toEqual({ r2: 0.8, dataPoints: 20, confidenceScore: 0.7 });
  });

  it("marks a fallback-sourced recommendation as isFallback: true, with no modelHealth", async () => {
    findMany.mockResolvedValue([
      {
        ...baseProduct,
        elasticityModel: null,
        recommendation: {
          action: "raise",
          rulesJson: JSON.stringify({
            suggestedPriceCents: 10800,
            fallbackLevel: "category",
            fallbackCategoryName: "Widgets",
            fallbackSourceCount: 4,
          }),
        },
      },
    ]);

    const res = await GET(req());
    const body = await res.json();

    expect(body[0].isFallback).toBe(true);
    expect(body[0].modelHealth).toBeNull();
    expect(body[0].suggestedPrice).toBe(10800);
  });

  it("marks a product with no recommendation at all as isFallback: false", async () => {
    findMany.mockResolvedValue([{ ...baseProduct }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body[0].isFallback).toBe(false);
    expect(body[0].recommendedAction).toBeNull();
    expect(body[0].suggestedPrice).toBeNull();
  });

  it("does not crash on unparseable rulesJson and treats it as not fallback", async () => {
    findMany.mockResolvedValue([
      {
        ...baseProduct,
        recommendation: { action: "raise", rulesJson: "not-json" },
      },
    ]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].isFallback).toBe(false);
    expect(body[0].recommendedAction).toBeNull();
  });
});
