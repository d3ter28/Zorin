import { beforeEach, describe, expect, it, vi } from "vitest";

const { campaignFindMany, salesFindMany, productFindMany, cogsChangeFindMany } = vi.hoisted(() => ({
  campaignFindMany: vi.fn(),
  salesFindMany: vi.fn(),
  productFindMany: vi.fn(),
  cogsChangeFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findMany: campaignFindMany },
    salesRecord: { findMany: salesFindMany },
    product: { findMany: productFindMany },
    cogsChange: { findMany: cogsChangeFindMany },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({ merchantId: "m1", user: { id: "u1", email: "e", merchantId: "m1" } })),
}));

import { GET } from "./route";
const req = () => ({}) as unknown as Request;
const d = (s: string) => new Date(s + "T00:00:00Z");

beforeEach(() => {
  campaignFindMany.mockReset();
  salesFindMany.mockReset();
  productFindMany.mockReset();
  cogsChangeFindMany.mockReset();
});

describe("GET /api/profit/campaigns", () => {
  it("computes during vs prior profit and delta", async () => {
    campaignFindMany.mockResolvedValue([{
      id: "c1", name: "Summer Sale", status: "completed", endsAt: d("2026-02-15"), revertedAt: d("2026-02-15"),
      products: [{ productId: "p1", appliedAt: d("2026-02-01") }],
    }]);
    // prior window = 2026-01-18..2026-02-01 (14 days); during = 2026-02-01..2026-02-15
    salesFindMany.mockResolvedValue([
      { productId: "p1", date: d("2026-01-20"), unitsSold: 2, priceCents: 1000 }, // prior
      { productId: "p1", date: d("2026-02-05"), unitsSold: 5, priceCents: 1000 }, // during
    ]);
    productFindMany.mockResolvedValue([{ id: "p1", cogs: 400 }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    const c = body[0];
    expect(c.productsChanged).toBe(1);
    expect(c.duringProfitCents).toBe(3000); // 5 * (1000-400)
    expect(c.priorProfitCents).toBe(1200);  // 2 * (1000-400)
    expect(c.deltaCents).toBe(1800);
    expect(c.noPriorBaseline).toBe(false);
    expect(c.stillRunning).toBe(false);
    expect(c.estimated).toBe(true); // no cogs history → fallback
  });

  it("flags noPriorBaseline when the prior window had no sales", async () => {
    campaignFindMany.mockResolvedValue([{
      id: "c2", name: "New Launch", status: "active", endsAt: null, revertedAt: null,
      products: [{ productId: "p2", appliedAt: d("2026-02-01") }],
    }]);
    salesFindMany.mockResolvedValue([{ productId: "p2", date: d("2026-02-05"), unitsSold: 3, priceCents: 1000 }]);
    productFindMany.mockResolvedValue([{ id: "p2", cogs: 500 }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    const c = (await res.json())[0];
    expect(c.noPriorBaseline).toBe(true);
    expect(c.stillRunning).toBe(true);
  });

  it("omits campaigns with no applied products", async () => {
    campaignFindMany.mockResolvedValue([{ id: "c3", name: "Draft", status: "draft", endsAt: null, revertedAt: null, products: [] }]);
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    const res = await GET(req());
    expect(await res.json()).toEqual([]);
  });
});
