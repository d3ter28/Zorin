import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, update, deleteOne } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    competitorPrice: { findFirst, update, delete: deleteOne },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

const { assertProductOwned } = vi.hoisted(() => ({ assertProductOwned: vi.fn(async () => undefined) }));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned,
  filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids),
}));

import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";

const ctx = (id: string, cpId: string) => ({ params: Promise.resolve({ id, cpId }) });
const reqWith = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const reqNoBody = () => ({}) as unknown as Request;

beforeEach(() => {
  findFirst.mockReset();
  update.mockReset();
  deleteOne.mockReset();
  assertProductOwned.mockReset();
  assertProductOwned.mockResolvedValue(undefined);
});

describe("PATCH /api/products/[id]/competitor-prices/[cpId]", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await PATCH(reqWith({ priceCents: 3000 }), ctx("p1", "cp1"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 404 when the row doesn't belong to this product", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await PATCH(reqWith({ priceCents: 3000 }), ctx("p1", "cp1"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive price", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    const res = await PATCH(reqWith({ priceCents: -1 }), ctx("p1", "cp1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    const req = {
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as unknown as Request;
    const res = await PATCH(req, ctx("p1", "cp1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the given fields and bumps capturedAt", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    (update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cp1",
      competitorName: "Acme",
      priceCents: 3200,
      url: null,
      capturedAt: new Date("2026-08-04"),
    });

    const res = await PATCH(reqWith({ priceCents: 3200 }), ctx("p1", "cp1"));

    expect(res.status).toBe(200);
    expect(prisma.competitorPrice.update).toHaveBeenCalledWith({
      where: { id: "cp1" },
      data: { priceCents: 3200, capturedAt: expect.any(Date) },
    });
  });
});

describe("DELETE /api/products/[id]/competitor-prices/[cpId]", () => {
  it("returns 404 when the row doesn't belong to this product", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await DELETE(reqNoBody(), ctx("p1", "cp1"));
    expect(res.status).toBe(404);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it("deletes the row", async () => {
    (findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cp1", productId: "p1" });
    (deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await DELETE(reqNoBody(), ctx("p1", "cp1"));
    expect(res.status).toBe(200);
    expect(prisma.competitorPrice.delete).toHaveBeenCalledWith({ where: { id: "cp1" } });
  });
});
