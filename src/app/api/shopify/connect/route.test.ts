import { beforeEach, describe, expect, it, vi } from "vitest";

// ── hoisted mocks ────────────────────────────────────────────────────────────

const { encryptToken, mockVerifyConnection, mockCreateWebhook } = vi.hoisted(() => ({
  encryptToken: vi.fn(),
  mockVerifyConnection: vi.fn(),
  mockCreateWebhook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shopify/crypto", () => ({ encryptToken }));

vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: class MockShopifyClient {
    constructor(
      public shopDomain: string,
      public accessToken: string,
    ) {}
    verifyConnection = mockVerifyConnection;
    createWebhook = mockCreateWebhook;
  },
  SHOPIFY_WEBHOOK_TOPICS: ["products/update", "orders/create", "app/uninstalled"],
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  encryptToken.mockReturnValue("enc:token");
  mockVerifyConnection.mockResolvedValue({ shopName: "My Shop" });
  mockCreateWebhook.mockResolvedValue("webhook-id-1");
  (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/shopify/connect", () => {
  it("returns 400 when shopDomain is missing", async () => {
    const res = await POST(req({ accessToken: "tok" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/shopDomain/i);
  });

  it("returns 400 when accessToken is missing", async () => {
    const res = await POST(req({ shopDomain: "mystore.myshopify.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/accessToken/i);
  });

  it("returns 400 when apiSecret is missing", async () => {
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/apiSecret/i);
  });

  it("normalizes domain — strips https:// and trailing path", async () => {
    const res = await POST(
      req({ shopDomain: "https://mystore.myshopify.com/admin", accessToken: "tok", apiSecret: "shhh" })
    );
    expect(res.status).toBe(200);
    // The upsert should have received the normalized domain
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
  });

  it("appends .myshopify.com if missing", async () => {
    const res = await POST(req({ shopDomain: "mystore", accessToken: "tok", apiSecret: "shhh" }));
    expect(res.status).toBe(200);
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
  });

  it("returns 400 when shopDomain is whitespace-only", async () => {
    const res = await POST(req({ shopDomain: "   ", accessToken: "tok", apiSecret: "shhh" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/shopDomain/i);
  });

  it("returns 401 when verifyConnection throws a 4xx error", async () => {
    mockVerifyConnection.mockRejectedValueOnce(new Error("401: [API] Invalid API key or access token"));
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "bad", apiSecret: "shhh" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 (not 401) when verifyConnection throws a network/5xx error", async () => {
    mockVerifyConnection.mockRejectedValueOnce(new Error("fetch failed: ECONNREFUSED"));
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok", apiSecret: "shhh" }));
    expect(res.status).toBe(500);
  });

  it("returns { success: true, shopName } on success and upserts", async () => {
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok", apiSecret: "shhh" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, shopName: "My Shop" });
    expect(prisma.shopifyConnection.upsert).toHaveBeenCalledOnce();
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.merchantId).toBe("m1");
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
    expect(call.create.encryptedToken).toBe("enc:token");
  });

  it("registers three webhooks and stores their ids on success", async () => {
    mockCreateWebhook
      .mockResolvedValueOnce("wh-1")
      .mockResolvedValueOnce("wh-2")
      .mockResolvedValueOnce("wh-3");
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok", apiSecret: "shhh" }));
    expect(res.status).toBe(200);
    expect(mockCreateWebhook).toHaveBeenCalledTimes(3);
    expect(mockCreateWebhook).toHaveBeenCalledWith("products/update", expect.stringContaining("/api/webhooks/shopify"));
    expect(mockCreateWebhook).toHaveBeenCalledWith("orders/create", expect.stringContaining("/api/webhooks/shopify"));
    expect(mockCreateWebhook).toHaveBeenCalledWith("app/uninstalled", expect.stringContaining("/api/webhooks/shopify"));
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.parse(call.create.webhookIds)).toEqual(["wh-1", "wh-2", "wh-3"]);
  });
});
