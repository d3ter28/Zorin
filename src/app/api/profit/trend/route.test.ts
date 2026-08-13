import { beforeEach, describe, expect, it, vi } from "vitest";

const { salesFindMany, productFindMany, cogsChangeFindMany } = vi.hoisted(() => ({
  salesFindMany: vi.fn(),
  productFindMany: vi.fn(),
  cogsChangeFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
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

beforeEach(() => {
  salesFindMany.mockReset();
  productFindMany.mockReset();
  cogsChangeFindMany.mockReset();
});

describe("GET /api/profit/trend", () => {
  it("returns monthly P&L points from non-promo sales", async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
    salesFindMany.mockResolvedValue([
      { productId: "p1", date: thisMonth, unitsSold: 5, priceCents: 1000 },
    ]);
    productFindMany.mockResolvedValue([{ id: "p1", cogs: 400 }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].revenueCents).toBe(5000);
    expect(body[0].grossProfitCents).toBe(3000);
    expect(body[0].estimated).toBe(true); // no cogs history → fallback
  });

  it("passes promotionFlag:false to the sales query", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    await GET(req());
    expect(salesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ merchantId: "m1", promotionFlag: false }) }),
    );
  });

  it("returns [] when there are no sales", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    const res = await GET(req());
    expect(await res.json()).toEqual([]);
  });

  it("scopes product and cogsChange queries to the merchant", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    await GET(req());
    expect(productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ merchantId: "m1" }) }),
    );
    expect(cogsChangeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ merchantId: "m1" }) }),
    );
  });

  it("excludes sales for products with no COGS data from the P&L", async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
    salesFindMany.mockResolvedValue([
      { productId: "p-nocogs", date: thisMonth, unitsSold: 5, priceCents: 1000 },
    ]);
    productFindMany.mockResolvedValue([{ id: "p-nocogs", cogs: null }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
