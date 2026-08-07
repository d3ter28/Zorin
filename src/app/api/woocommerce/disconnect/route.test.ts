import { beforeEach, describe, expect, it, vi } from "vitest";

const { decrypt, mockDeleteWebhook } = vi.hoisted(() => ({
  decrypt: vi.fn(),
  mockDeleteWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/woocommerce/crypto", () => ({ decrypt }));

vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: class MockWooCommerceClient {
    constructor(
      public storeUrl: string,
      public consumerKey: string,
      public consumerSecret: string,
    ) {}
    deleteWebhook = mockDeleteWebhook;
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1", role: "OWNER" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { HttpError } from "@/lib/api/errors";

function req(): Request {
  return {} as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  decrypt.mockReturnValue("plain-value");
  mockDeleteWebhook.mockResolvedValue(undefined);
  (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
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

  it("deletes each registered webhook before deleting the connection", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc",
      encryptedSecret: "enc",
      webhookIds: JSON.stringify(["wh-1", "wh-2"]),
    });
    (prisma.wooCommerceConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-1");
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-2");
    expect(prisma.wooCommerceConnection.delete).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
  });

  it("still deletes the connection if a webhook deletion fails", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc",
      encryptedSecret: "enc",
      webhookIds: JSON.stringify(["wh-1"]),
    });
    (prisma.wooCommerceConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    mockDeleteWebhook.mockRejectedValueOnce(new Error("401: revoked"));

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(prisma.wooCommerceConnection.delete).toHaveBeenCalled();
  });

  it("returns 403 when the caller is a Member, not the Owner", async () => {
    vi.mocked(requireOwnerApi).mockRejectedValue(new HttpError(403, "Owner access required"));

    const res = await POST(req());

    expect(res.status).toBe(403);
    expect(prisma.wooCommerceConnection.delete).not.toHaveBeenCalled();
  });
});
