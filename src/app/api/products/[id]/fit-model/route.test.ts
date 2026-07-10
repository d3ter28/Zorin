import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany, upsert } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findFirst },
    salesRecord: { findMany },
    elasticityModel: { upsert },
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

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset();
  upsert.mockReset();
});

describe("POST /api/products/[id]/fit-model", () => {
  it("fits and upserts model when sufficient records exist", async () => {
    findFirst.mockResolvedValue({ id: "p1", merchantId: "m1" });
    findMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 50, date: new Date("2024-01-01") },
      { priceCents: 1200, unitsSold: 40, date: new Date("2024-01-02") },
      { priceCents: 800, unitsSold: 70, date: new Date("2024-01-03") },
    ]);
    upsert.mockResolvedValue({});

    const res = await POST(req(), ctx("p1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("elasticity");
    expect(body).toHaveProperty("intercept");
    expect(body).toHaveProperty("r2");
    expect(body).toHaveProperty("dataPoints", 3);

    expect(findMany).toHaveBeenCalledWith({
      where: { productId: "p1", promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p1" },
        create: expect.objectContaining({ productId: "p1", dataPoints: 3 }),
        update: expect.objectContaining({ dataPoints: 3 }),
      }),
    );
  });

  it("returns 400 when fewer than 3 valid records", async () => {
    findFirst.mockResolvedValue({ id: "p1", merchantId: "m1" });
    findMany.mockResolvedValue([
      { priceCents: 1000, unitsSold: 50 },
      { priceCents: 1200, unitsSold: 40 },
    ]);

    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 404 for a product not owned by the merchant", async () => {
    findFirst.mockResolvedValue(null);

    const res = await POST(req(), ctx("foreign"));
    expect(res.status).toBe(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("excludes promotional records via the query filter", async () => {
    findFirst.mockResolvedValue({ id: "p1", merchantId: "m1" });
    findMany.mockResolvedValue([]);

    await POST(req(), ctx("p1"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ promotionFlag: false }),
      }),
    );
  });
});
