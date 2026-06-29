import { beforeEach, describe, expect, it, vi } from "vitest";

const { importProducts } = vi.hoisted(() => ({ importProducts: vi.fn() }));
const { findFirst, create } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { findFirst, create } },
}));
vi.mock("@/lib/products/importProducts", () => ({ importProducts }));

import { POST } from "./route";

const req = (body: string) => ({ text: async () => body }) as unknown as Request;

beforeEach(() => {
  importProducts.mockReset();
  findFirst.mockReset();
  create.mockReset();
});

describe("POST /api/products/catalog", () => {
  it("parses the body, imports into the resolved merchant, and returns the summary", async () => {
    findFirst.mockResolvedValue({ id: "m1" });
    importProducts.mockResolvedValue({ inserted: 2, updated: 0, skipped: 0, errors: [] });

    const res = await POST(req("TEE-100,Linen Shirt,49.99,Apparel,18.00,40"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ inserted: 2 });
    expect(importProducts).toHaveBeenCalledOnce();
    expect(importProducts.mock.calls[0][1]).toBe("m1");
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a default merchant when none exists", async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: "m-new" });
    importProducts.mockResolvedValue({ inserted: 1, updated: 0, skipped: 0, errors: [] });

    await POST(req("TEE-100,Linen Shirt,49.99,Apparel,18.00,40"));

    expect(create).toHaveBeenCalledOnce();
    expect(importProducts.mock.calls[0][1]).toBe("m-new");
  });

  it("returns 400 for an empty body", async () => {
    const res = await POST(req("   "));
    expect(res.status).toBe(400);
    expect(importProducts).not.toHaveBeenCalled();
  });
});
