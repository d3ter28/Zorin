import { beforeEach, describe, expect, it, vi } from "vitest";

const { refreshProduct } = vi.hoisted(() => ({ refreshProduct: vi.fn() }));
const { filterOwnedProductIds } = vi.hoisted(() => ({ filterOwnedProductIds: vi.fn() }));

vi.mock("@/lib/scrape/refreshProduct", () => ({ refreshProduct }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
  })),
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned: vi.fn(async () => undefined),
  filterOwnedProductIds,
}));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://test/api/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  refreshProduct.mockReset();
  filterOwnedProductIds.mockReset();
  // Default: pass through all ids as owned
  filterOwnedProductIds.mockImplementation(async (_p: unknown, ids: string[]) => ids);
});

describe("POST /api/refresh", () => {
  it("refreshes products and accumulates results", async () => {
    refreshProduct
      .mockResolvedValueOnce({ refreshed: 1, failed: 0, results: [] })
      .mockResolvedValueOnce({ refreshed: 0, failed: 1, results: [] });

    const res = await POST(req({ productIds: ["p1", "p2"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ refreshed: 1, failed: 1 });
    expect(refreshProduct).toHaveBeenCalledTimes(2);
  });

  it("is a no-op for an empty productIds array", async () => {
    const res = await POST(req({ productIds: [] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ refreshed: 0, failed: 0 });
    expect(refreshProduct).not.toHaveBeenCalled();
  });

  it("returns 400 when productIds is missing or not an array", async () => {
    const res = await POST(req({ nope: true }));
    expect(res.status).toBe(400);
    expect(refreshProduct).not.toHaveBeenCalled();
  });

  it("refreshes only owned ids, silently dropping foreign ones", async () => {
    filterOwnedProductIds.mockResolvedValue(["p1"]);
    refreshProduct.mockResolvedValue({ refreshed: 1, failed: 0, results: [] });

    const res = await POST(req({ productIds: ["p1", "foreign"] }));

    expect(res.status).toBe(200);
    expect(refreshProduct).toHaveBeenCalledTimes(1);
    expect(refreshProduct.mock.calls[0][1]).toBe("p1");
  });
});
