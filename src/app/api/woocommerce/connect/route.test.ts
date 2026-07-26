import { beforeEach, describe, expect, it, vi } from "vitest";

// ── hoisted mocks ────────────────────────────────────────────────────────────

const { encrypt, mockVerifyConnection } = vi.hoisted(() => ({
  encrypt: vi.fn(),
  mockVerifyConnection: vi.fn(),
}));

vi.mock("@/lib/woocommerce/crypto", () => ({ encrypt }));

vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: class MockWooCommerceClient {
    constructor(
      public storeUrl: string,
      public consumerKey: string,
      public consumerSecret: string,
    ) {}
    verifyConnection = mockVerifyConnection;
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      upsert: vi.fn(),
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

function req(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  encrypt.mockImplementation((s: string) => `enc:${s}`);
  mockVerifyConnection.mockResolvedValue({ storeName: "My WooCommerce Store" });
  (prisma.wooCommerceConnection.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/woocommerce/connect", () => {
  it("returns 400 when storeUrl is missing", async () => {
    const res = await POST(req({ consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/storeUrl/i);
  });

  it("returns 400 when consumerKey is missing", async () => {
    const res = await POST(req({ storeUrl: "https://mystore.example.com", consumerSecret: "cs_456" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/consumerKey/i);
  });

  it("returns 400 when consumerSecret is missing", async () => {
    const res = await POST(req({ storeUrl: "https://mystore.example.com", consumerKey: "ck_123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/consumerSecret/i);
  });

  it("returns 400 when storeUrl is whitespace-only", async () => {
    const res = await POST(req({ storeUrl: "   ", consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/storeUrl/i);
  });

  it("normalizes storeUrl — strips trailing slash", async () => {
    const res = await POST(req({ storeUrl: "https://mystore.example.com/", consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(200);
    const call = (prisma.wooCommerceConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.storeUrl).toBe("https://mystore.example.com");
  });

  it("normalizes storeUrl — adds https:// when no scheme", async () => {
    const res = await POST(req({ storeUrl: "mystore.example.com", consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(200);
    const call = (prisma.wooCommerceConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.storeUrl).toBe("https://mystore.example.com");
  });

  it("normalizes storeUrl — replaces http:// with https://", async () => {
    const res = await POST(req({ storeUrl: "http://mystore.example.com", consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(200);
    const call = (prisma.wooCommerceConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.storeUrl).toBe("https://mystore.example.com");
  });

  it("returns 400 when verifyConnection throws a 4xx error", async () => {
    mockVerifyConnection.mockRejectedValueOnce(new Error("401: [API] Invalid consumer key"));
    const res = await POST(req({ storeUrl: "https://mystore.example.com", consumerKey: "bad", consumerSecret: "bad" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid WooCommerce credentials or store URL/i);
  });

  it("returns 500 (not 400) when verifyConnection throws a network error", async () => {
    mockVerifyConnection.mockRejectedValueOnce(new Error("fetch failed: ECONNREFUSED"));
    const res = await POST(req({ storeUrl: "https://mystore.example.com", consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(500);
  });

  it("returns { storeName } on success and upserts with encrypted credentials", async () => {
    const res = await POST(req({ storeUrl: "https://mystore.example.com", consumerKey: "ck_123", consumerSecret: "cs_456" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ storeName: "My WooCommerce Store" });
    expect(prisma.wooCommerceConnection.upsert).toHaveBeenCalledOnce();
    const call = (prisma.wooCommerceConnection.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.merchantId).toBe("m1");
    expect(call.create.storeUrl).toBe("https://mystore.example.com");
    expect(call.create.encryptedKey).toBe("enc:ck_123");
    expect(call.create.encryptedSecret).toBe("enc:cs_456");
  });
});
