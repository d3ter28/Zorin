import { beforeEach, describe, expect, it, vi } from "vitest";

const { decryptToken, mockDeleteWebhook } = vi.hoisted(() => ({
  decryptToken: vi.fn(),
  mockDeleteWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shopify/crypto", () => ({ decryptToken }));

vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: class MockShopifyClient {
    constructor(
      public shopDomain: string,
      public accessToken: string,
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
  decryptToken.mockReturnValue("plain-token");
  mockDeleteWebhook.mockResolvedValue(undefined);
  (prisma.shopifyConnection.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/shopify/disconnect", () => {
  it("deletes each registered webhook before deleting the connection", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      webhookIds: JSON.stringify(["wh-1", "wh-2"]),
    });

    const res = await POST(req());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-1");
    expect(mockDeleteWebhook).toHaveBeenCalledWith("wh-2");
    expect(prisma.shopifyConnection.delete).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
  });

  it("still deletes the connection if a webhook deletion fails (revoked credentials)", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      webhookIds: JSON.stringify(["wh-1"]),
    });
    mockDeleteWebhook.mockRejectedValueOnce(new Error("401: revoked"));

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(prisma.shopifyConnection.delete).toHaveBeenCalled();
  });

  it("skips webhook cleanup entirely when there is no connection row", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(mockDeleteWebhook).not.toHaveBeenCalled();
    expect(prisma.shopifyConnection.delete).toHaveBeenCalled();
  });

  it("returns 404 when no connection exists (Prisma P2025)", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const err = Object.assign(new Error("Record not found"), { code: "P2025" });
    (prisma.shopifyConnection.delete as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    const res = await POST(req());
    expect(res.status).toBe(404);
  });

  it("returns 403 when the caller is a Member, not the Owner", async () => {
    vi.mocked(requireOwnerApi).mockRejectedValue(new HttpError(403, "Owner access required"));

    const res = await POST(req());

    expect(res.status).toBe(403);
    expect(prisma.shopifyConnection.delete).not.toHaveBeenCalled();
  });
});
