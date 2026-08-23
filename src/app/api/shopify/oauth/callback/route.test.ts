import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireSessionPage,
  mockUpsert,
  encryptToken,
  mockCreateWebhook,
  isValidShopDomain,
  verifyOAuthHmac,
  exchangeCodeForToken,
  getAppClientSecret,
} = vi.hoisted(() => ({
  mockRequireSessionPage: vi.fn(),
  mockUpsert: vi.fn(),
  encryptToken: vi.fn(),
  mockCreateWebhook: vi.fn(),
  isValidShopDomain: vi.fn(),
  verifyOAuthHmac: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getAppClientSecret: vi.fn(),
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionPage: () => mockRequireSessionPage(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { shopifyConnection: { upsert: mockUpsert } },
}));

vi.mock("@/lib/shopify/crypto", () => ({ encryptToken }));

vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: class MockShopifyClient {
    constructor(public shopDomain: string, public accessToken: string) {}
    createWebhook = mockCreateWebhook;
  },
  SHOPIFY_WEBHOOK_TOPICS: ["products/update", "orders/create", "app/uninstalled"],
}));

vi.mock("@/lib/appConfig", () => ({
  getAppUrl: () => "https://www.tryzorin.com",
}));

vi.mock("@/lib/shopify/oauth", () => ({
  isValidShopDomain,
  verifyOAuthHmac,
  exchangeCodeForToken,
  getAppClientSecret,
}));

import { GET } from "./route";

function req(url: string, cookieHeader?: string): NextRequest {
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

const VALID_URL =
  "http://localhost/api/shopify/oauth/callback?shop=mystore.myshopify.com&code=abc&state=xyz&hmac=deadbeef";
const VALID_COOKIES = "shopify_oauth_state=xyz; shopify_oauth_shop=mystore.myshopify.com";

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSessionPage.mockResolvedValue({ merchantId: "m1", user: {} });
  isValidShopDomain.mockReturnValue(true);
  verifyOAuthHmac.mockReturnValue(true);
  exchangeCodeForToken.mockResolvedValue({ accessToken: "shpat_live", scope: "read_orders,read_products,write_products" });
  getAppClientSecret.mockReturnValue("app-secret");
  encryptToken.mockImplementation((v: string) => `enc:${v}`);
  mockCreateWebhook.mockResolvedValueOnce("wh-1").mockResolvedValueOnce("wh-2").mockResolvedValueOnce("wh-3");
  mockUpsert.mockResolvedValue({});
});

describe("GET /api/shopify/oauth/callback", () => {
  it("redirects with an error when the shop domain is invalid", async () => {
    isValidShopDomain.mockReturnValue(false);
    const res = await GET(req(VALID_URL, VALID_COOKIES));
    const location = res.headers.get("location");
    expect(location).toContain("/settings/integrations");
    expect(location).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("redirects with an error when code or state is missing", async () => {
    const res = await GET(
      req("http://localhost/api/shopify/oauth/callback?shop=mystore.myshopify.com", VALID_COOKIES)
    );
    expect(res.headers.get("location")).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("redirects with an error when the HMAC doesn't verify", async () => {
    verifyOAuthHmac.mockReturnValue(false);
    const res = await GET(req(VALID_URL, VALID_COOKIES));
    expect(res.headers.get("location")).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("redirects with an error when the state cookie doesn't match", async () => {
    const res = await GET(req(VALID_URL, "shopify_oauth_state=different; shopify_oauth_shop=mystore.myshopify.com"));
    expect(res.headers.get("location")).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("redirects with an error when the shop cookie doesn't match the shop param", async () => {
    const res = await GET(req(VALID_URL, "shopify_oauth_state=xyz; shopify_oauth_shop=other-store.myshopify.com"));
    expect(res.headers.get("location")).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("redirects with an error when the state cookie is missing entirely", async () => {
    const res = await GET(req(VALID_URL));
    expect(res.headers.get("location")).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("exchanges the code, registers three webhooks, and upserts the connection on success", async () => {
    const res = await GET(req(VALID_URL, VALID_COOKIES));

    expect(exchangeCodeForToken).toHaveBeenCalledWith("mystore.myshopify.com", "abc");
    expect(mockCreateWebhook).toHaveBeenCalledTimes(3);
    expect(mockCreateWebhook).toHaveBeenCalledWith("products/update", expect.stringContaining("/api/webhooks/shopify"));

    expect(mockUpsert).toHaveBeenCalledOnce();
    const call = mockUpsert.mock.calls[0][0];
    expect(call.where.merchantId).toBe("m1");
    expect(call.create.shopDomain).toBe("mystore.myshopify.com");
    expect(call.create.encryptedToken).toBe("enc:shpat_live");
    expect(call.create.encryptedApiSecret).toBe("enc:app-secret");
    expect(JSON.parse(call.create.webhookIds)).toEqual(["wh-1", "wh-2", "wh-3"]);

    const location = res.headers.get("location");
    expect(location).toContain("/settings/integrations");
    expect(location).toContain("shopify_connected=1");
  });

  it("clears the oauth cookies on both success and failure", async () => {
    const okRes = await GET(req(VALID_URL, VALID_COOKIES));
    expect(okRes.cookies.get("shopify_oauth_state")?.value).toBe("");

    verifyOAuthHmac.mockReturnValue(false);
    const failRes = await GET(req(VALID_URL, VALID_COOKIES));
    expect(failRes.cookies.get("shopify_oauth_state")?.value).toBe("");
  });

  it("redirects with a generic error when token exchange throws", async () => {
    exchangeCodeForToken.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(req(VALID_URL, VALID_COOKIES));
    expect(res.headers.get("location")).toContain("shopify_error=");
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
