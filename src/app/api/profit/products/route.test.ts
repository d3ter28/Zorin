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
const reqWith = (window?: string) =>
  ({ url: `http://t/api/profit/products${window ? `?window=${window}` : ""}` }) as unknown as Request;

beforeEach(() => {
  salesFindMany.mockReset();
  productFindMany.mockReset();
  cogsChangeFindMany.mockReset();
});

describe("GET /api/profit/products", () => {
  it("returns per-product profit enriched with title/sku", async () => {
    const recent = new Date();
    salesFindMany.mockResolvedValue([{ productId: "p1", date: recent, unitsSold: 10, priceCents: 1000 }]);
    productFindMany.mockResolvedValue([{ id: "p1", cogs: 400, title: "Widget", sku: "W-1" }]);
    cogsChangeFindMany.mockResolvedValue([]);

    const res = await GET(reqWith("30"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.window).toBe(30);
    expect(body.products[0]).toMatchObject({ productId: "p1", title: "Widget", sku: "W-1", grossProfitCents: 6000 });
    expect(body.products[0].marginPct).toBeCloseTo(0.6, 5);
  });

  it("defaults window to 90 when invalid", async () => {
    salesFindMany.mockResolvedValue([]);
    productFindMany.mockResolvedValue([]);
    cogsChangeFindMany.mockResolvedValue([]);
    const res = await GET(reqWith("banana"));
    expect((await res.json()).window).toBe(90);
  });
});
