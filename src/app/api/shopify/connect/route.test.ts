import { beforeEach, describe, expect, it, vi } from "vitest";

// ── hoisted mocks ────────────────────────────────────────────────────────────

const { encryptToken, mockVerifyConnection } = vi.hoisted(() => ({
  encryptToken: vi.fn(),
  mockVerifyConnection: vi.fn(),
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
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
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

  it("normalizes domain — strips https:// and trailing path", async () => {
    const res = await POST(req({ shopDomain: "https://mystore.myshopify.com/admin", accessToken: "tok" }));
    expect(res.status).toBe(200);
    // The upsert should have received the normalized domain
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
  });

  it("appends .myshopify.com if missing", async () => {
    const res = await POST(req({ shopDomain: "mystore", accessToken: "tok" }));
    expect(res.status).toBe(200);
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
  });

  it("returns 401 when verifyConnection throws", async () => {
    mockVerifyConnection.mockRejectedValueOnce(new Error("401: [API] Invalid API key or access token"));
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "bad" }));
    expect(res.status).toBe(401);
  });

  it("returns { success: true, shopName } on success and upserts", async () => {
    const res = await POST(req({ shopDomain: "mystore.myshopify.com", accessToken: "tok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, shopName: "My Shop" });
    expect(prisma.shopifyConnection.upsert).toHaveBeenCalledOnce();
    const call = (prisma.shopifyConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.merchantId).toBe("m1");
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
    expect(call.create.encryptedToken).toBe("enc:token");
  });
});
