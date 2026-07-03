import { beforeEach, describe, expect, it, vi } from "vitest";

const { importProducts } = vi.hoisted(() => ({ importProducts: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/products/importProducts", () => ({ importProducts }));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";

const req = (body: string) => ({ text: async () => body }) as unknown as Request;

beforeEach(() => {
  importProducts.mockReset();
});

describe("POST /api/products/catalog", () => {
  it("parses the body, imports into the session merchant, and returns the summary", async () => {
    importProducts.mockResolvedValue({ inserted: 2, updated: 0, skipped: 0, errors: [] });

    const res = await POST(req("TEE-100,Linen Shirt,49.99,Apparel,18.00,40"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ inserted: 2 });
    expect(importProducts).toHaveBeenCalledOnce();
    expect(importProducts.mock.calls[0][1]).toBe("m1");
  });

  it("returns 400 for an empty body", async () => {
    const res = await POST(req("   "));
    expect(res.status).toBe(400);
    expect(importProducts).not.toHaveBeenCalled();
  });
});
