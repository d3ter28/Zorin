import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, upsert, findManySalesRecords, computeCategoryFallback } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  upsert: vi.fn(),
  findManySalesRecords: vi.fn(),
  computeCategoryFallback: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findFirst },
    recommendation: { upsert },
    salesRecord: { findMany: findManySalesRecords },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

vi.mock("@/lib/elasticity/categoryFallback", () => ({
  computeCategoryFallback,
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => ({}) as unknown as Request;

const elasticityModel = {
  id: "em1",
  productId: "p1",
  elasticity: -1.5,
  intercept: 12.0,
  r2: 0.85,
  dataPoints: 10,
  fittedAt: new Date(),
};

const productWithModel = {
  id: "p1",
  merchantId: "m1",
  currentPrice: 1000,
  cogs: 400,
  category: "Skincare",
  estUnits: null,
  elasticityModel,
};

beforeEach(() => {
  findFirst.mockReset();
  upsert.mockReset();
  findManySalesRecords.mockReset().mockResolvedValue([]);
  computeCategoryFallback.mockReset();
});

describe("POST /api/products/[id]/recommend", () => {
  it("generates and upserts a recommendation", async () => {
    findFirst.mockResolvedValue(productWithModel);
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("action");
    expect(body).toHaveProperty("suggestedPriceCents");
    expect(body).toHaveProperty("deltaPct");
    expect(body).toHaveProperty("reasoning");
    expect(body).toHaveProperty("expectedProfitLiftPct");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p1" },
        create: expect.objectContaining({
          productId: "p1",
          action: body.action,
          deltaPct: body.deltaPct,
          phrasing: body.reasoning,
        }),
      }),
    );

    // Verify rulesJson contains expected keys
    const call = upsert.mock.calls[0][0];
    const rulesJson = JSON.parse(call.create.rulesJson);
    expect(rulesJson).toHaveProperty("suggestedPriceCents");
    expect(rulesJson).toHaveProperty("expectedProfitLiftPct");
    expect(rulesJson).toHaveProperty("elasticity");
    expect(rulesJson).toHaveProperty("r2");
    expect(rulesJson).toHaveProperty("dataPoints");
  });

  it("returns 404 for a product not owned by the merchant", async () => {
    findFirst.mockResolvedValue(null);

    const res = await POST(req(), ctx("foreign"));
    expect(res.status).toBe(404);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 400 when no elasticity model exists", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
    });

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/model/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 400 when COGS is null", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      cogs: null,
    });

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cogs/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("falls back to a category-sourced recommendation when no elasticityModel exists but sales records and cogs do", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
    });
    findManySalesRecords.mockResolvedValue([
      { priceCents: 1000, unitsSold: 5, date: new Date() },
      { priceCents: 1000, unitsSold: 7, date: new Date() },
    ]);
    computeCategoryFallback.mockResolvedValue({
      elasticity: -2.0,
      level: "category",
      sourceCount: 3,
      categoryName: "Skincare",
    });
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(200);

    expect(computeCategoryFallback).toHaveBeenCalledWith(expect.anything(), "m1", "p1");

    const call = upsert.mock.calls[0][0];
    const rulesJson = JSON.parse(call.create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("category");
    expect(rulesJson.fallbackCategoryName).toBe("Skincare");
    expect(rulesJson.fallbackSourceCount).toBe(3);
    expect(rulesJson.elasticity).toBe(-2.0);
  });

  it("falls back to a catalog-sourced recommendation when the category has too few qualifying siblings", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
    });
    findManySalesRecords.mockResolvedValue([
      { priceCents: 1000, unitsSold: 5, date: new Date() },
    ]);
    computeCategoryFallback.mockResolvedValue({
      elasticity: -2.5,
      level: "catalog",
      sourceCount: 3,
    });
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(200);

    const rulesJson = JSON.parse(upsert.mock.calls[0][0].create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("catalog");
  });

  it("uses estUnits as the baseline when there are zero sales records", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
      estUnits: 20,
    });
    findManySalesRecords.mockResolvedValue([]);
    computeCategoryFallback.mockResolvedValue({
      elasticity: -1.2,
      level: "global",
      sourceCount: 0,
    });
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(200);

    const rulesJson = JSON.parse(upsert.mock.calls[0][0].create.rulesJson);
    expect(rulesJson.fallbackLevel).toBe("global");
  });

  it("still 400s when there is no elasticityModel AND no sales records AND no estUnits", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
      estUnits: null,
    });
    findManySalesRecords.mockResolvedValue([]);

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/model/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("checks cogs before attempting a fallback", async () => {
    findFirst.mockResolvedValue({
      ...productWithModel,
      elasticityModel: null,
      cogs: null,
    });

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cogs/i);
    expect(findManySalesRecords).not.toHaveBeenCalled(); // never got as far as checking baseline
  });
});
