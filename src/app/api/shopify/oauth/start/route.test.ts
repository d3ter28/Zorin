import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSessionPage = vi.fn();

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionPage: () => mockRequireSessionPage(),
}));

vi.mock("@/lib/shopify/oauth", () => ({
  isValidShopDomain: (shop: string) => /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop),
  buildAuthorizeUrl: (shop: string, state: string) =>
    `https://${shop}/admin/oauth/authorize?state=${state}`,
}));

import { GET } from "./route";

function req(url: string): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireSessionPage.mockResolvedValue({ merchantId: "m1", user: {} });
});

describe("GET /api/shopify/oauth/start", () => {
  it("redirects to Shopify's authorize screen for a valid shop", async () => {
    const res = await GET(req("http://localhost/api/shopify/oauth/start?shop=mystore.myshopify.com"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("https://mystore.myshopify.com/admin/oauth/authorize");
  });

  it("sets an httpOnly state cookie and a shop cookie", async () => {
    const res = await GET(req("http://localhost/api/shopify/oauth/start?shop=mystore.myshopify.com"));
    const stateCookie = res.cookies.get("shopify_oauth_state");
    const shopCookie = res.cookies.get("shopify_oauth_shop");
    expect(stateCookie?.value).toBeTruthy();
    expect(shopCookie?.value).toBe("mystore.myshopify.com");
  });

  it("redirects back to settings with an error for an invalid shop domain", async () => {
    const res = await GET(req("http://localhost/api/shopify/oauth/start?shop=not-a-shop"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/settings/integrations");
    expect(location).toContain("shopify_error=");
  });

  it("redirects back to settings with an error when shop is missing", async () => {
    const res = await GET(req("http://localhost/api/shopify/oauth/start"));
    const location = res.headers.get("location");
    expect(location).toContain("shopify_error=");
  });
});
