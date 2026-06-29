import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update, deleteMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique, update },
    recommendation: { deleteMany },
  },
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  deleteMany.mockReset();
});

describe("POST /api/products/[id]/apply", () => {
  it("returns 404 for an unknown product and writes nothing", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST({} as Request, ctx("nope"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("applies a raise: writes suggestedPrice, clears recommendation, applied:true", async () => {
    findUnique.mockResolvedValue({
      id: "p1",
      currentPrice: 8000,
      cogs: 4000,
      competitors: [
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
        { price: 10000, observedAt: new Date("2026-06-28T00:00:00.000Z") },
      ],
    });
    update.mockResolvedValue({});
    deleteMany.mockResolvedValue({});

    const res = await POST({} as Request, ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ currentPrice: 10000, action: "raise", applied: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { currentPrice: 10000 },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("is a no-op on hold: no write, applied:false", async () => {
    findUnique.mockResolvedValue({
      id: "p2",
      currentPrice: 5000,
      cogs: 2000,
      competitors: [],
    });

    const res = await POST({} as Request, ctx("p2"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ currentPrice: 5000, action: "hold", applied: false });
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
