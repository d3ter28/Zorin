import { beforeEach, describe, expect, it, vi } from "vitest";

const { productUpdate, productFindUnique, cogsChangeCreate, recommendationDeleteMany } = vi.hoisted(() => ({
  productUpdate: vi.fn(async () => ({})),
  productFindUnique: vi.fn(),
  cogsChangeCreate: vi.fn(async () => ({})),
  recommendationDeleteMany: vi.fn(async () => ({})),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { update: productUpdate, findUnique: productFindUnique },
    cogsChange: { create: cogsChangeCreate },
    recommendation: { deleteMany: recommendationDeleteMany },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
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

function reqWithBody(body: unknown): Request {
  return new Request("http://t/api/products/p1/cogs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  productUpdate.mockReset();
  productFindUnique.mockReset();
  cogsChangeCreate.mockReset();
  recommendationDeleteMany.mockReset();
  assertProductOwned.mockReset();
  assertProductOwned.mockResolvedValue(undefined);
  productUpdate.mockResolvedValue({});
  cogsChangeCreate.mockResolvedValue({});
  recommendationDeleteMany.mockResolvedValue({});
});

describe("POST /api/products/[id]/cogs", () => {
  it("updates cogs and invalidates the cached recommendation", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 2000 });
    const res = await POST(reqWithBody({ cogs: 2600 }), ctx("p1"));

    expect(res.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { cogs: 2600 },
    });
    expect(recommendationDeleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("returns 400 for an invalid (negative) cogs and does not touch the DB", async () => {
    const res = await POST(reqWithBody({ cogs: -5 }), ctx("p1"));
    expect(res.status).toBe(400);
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    const req = new Request("http://t/api/products/p1/cogs", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, ctx("p1"));
    expect(res.status).toBe(400);
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown product", async () => {
    const { HttpError } = await import("@/lib/api/errors");
    assertProductOwned.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await POST(reqWithBody({ cogs: 100 }), ctx("nope"));
    expect(res.status).toBe(404);
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it("logs a CogsChange with prior and new value on edit", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 4000 });
    const res = await POST(reqWithBody({ cogs: 5000 }), ctx("p1"));
    expect(res.status).toBe(200);
    expect(cogsChangeCreate).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", fromCents: 4000, toCents: 5000, source: "manual_edit" },
    });
  });

  it("logs fromCents null when prior cogs was null", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: null });
    await POST(reqWithBody({ cogs: 5000 }), ctx("p1"));
    expect(cogsChangeCreate).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", fromCents: null, toCents: 5000, source: "manual_edit" },
    });
  });

  it("does NOT log a CogsChange when the value is unchanged", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 4000 });
    await POST(reqWithBody({ cogs: 4000 }), ctx("p1"));
    expect(cogsChangeCreate).not.toHaveBeenCalled();
  });

  it("does NOT log when new cogs is null (cleared)", async () => {
    productFindUnique.mockResolvedValue({ id: "p1", merchantId: "m1", cogs: 4000 });
    await POST(reqWithBody({ cogs: null }), ctx("p1"));
    expect(cogsChangeCreate).not.toHaveBeenCalled();
  });
});
