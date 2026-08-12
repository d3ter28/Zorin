import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProductFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: { product: { findMany: mockProductFindMany } },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", merchantId: "m1" } })),
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return { json: async () => body, text: async () => JSON.stringify(body) } as unknown as Request;
}

beforeEach(() => vi.resetAllMocks());

describe("POST /api/campaigns/preview", () => {
  it("returns dry-run preview with summary stats", async () => {
    mockProductFindMany.mockResolvedValue([
      { id: "p1", title: "Mug", sku: "MUG-1", currentPrice: 1000, cogs: 500, recommendation: null, competitorPrices: [] },
      { id: "p2", title: "Bottle", sku: "BTL-1", currentPrice: 2000, cogs: 800, recommendation: null, competitorPrices: [] },
    ]);

    const res = await POST(makeReq({
      productIds: ["p1", "p2"],
      rules: { mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalProducts).toBe(2);
    expect(body.changing).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.products).toHaveLength(2);
    expect(body.products[0].targetPriceCents).toBe(1100);
  });

  it("returns 400 when productIds is missing", async () => {
    const res = await POST(makeReq({ rules: { mode: "percentage", percentage: 10, rounding: "none", marginFloorPct: 10 } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rules.mode is missing", async () => {
    const res = await POST(makeReq({ productIds: ["p1"], rules: {} }));
    expect(res.status).toBe(400);
  });
});
