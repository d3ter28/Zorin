import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, upsert } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findFirst },
    recommendation: { upsert },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
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
  elasticityModel,
};

beforeEach(() => {
  findFirst.mockReset();
  upsert.mockReset();
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
});
