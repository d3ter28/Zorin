import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      delete: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/woocommerce/disconnect", () => {
  it("deletes the connection, clears product fields, and returns { ok: true }", async () => {
    (prisma.wooCommerceConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(prisma.wooCommerceConnection.delete).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
    });
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
      data: { woocommerceVariantId: null, woocommerceParentId: null },
    });
  });

  it("returns 404 when no connection exists (Prisma P2025)", async () => {
    const err = Object.assign(new Error("Record not found"), { code: "P2025" });
    (prisma.wooCommerceConnection.delete as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    const res = await POST(req());
    expect(res.status).toBe(404);
  });
});
