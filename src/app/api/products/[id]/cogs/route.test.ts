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

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const reqWith = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request;

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  deleteMany.mockReset();
  assertProductOwned.mockReset();
  assertProductOwned.mockResolvedValue(undefined);
});

describe("POST /api/products/[id]/cogs", () => {
  it("updates cogs and invalidates the cached recommendation", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    update.mockResolvedValue({});
    deleteMany.mockResolvedValue({});

    const res = await POST(reqWith({ cogs: 2600 }), ctx("p1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { cogs: 2600 },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("returns 400 for an invalid (negative) cogs and does not touch the DB", async () => {
    const res = await POST(reqWith({ cogs: -5 }), ctx("p1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    const req = {
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as unknown as Request;
    const res = await POST(req, ctx("p1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown product", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await POST(reqWith({ cogs: 100 }), ctx("nope"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});
