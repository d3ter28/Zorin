import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import {
  isValidShopDomain,
  buildAuthorizeUrl,
  verifyOAuthHmac,
  getOAuthCallbackUrl,
  SHOPIFY_OAUTH_SCOPES,
} from "./oauth";

beforeAll(() => {
  process.env.SHOPIFY_API_KEY = "test_client_id";
  process.env.SHOPIFY_API_SECRET = "test_client_secret";
  process.env.NEXT_PUBLIC_APP_URL = "https://www.tryzorin.com";
});

describe("isValidShopDomain", () => {
  it("accepts a well-formed myshopify.com domain", () => {
    expect(isValidShopDomain("mystore.myshopify.com")).toBe(true);
  });

  it("rejects a bare domain without myshopify.com", () => {
    expect(isValidShopDomain("mystore.com")).toBe(false);
  });

  it("rejects a domain with a scheme or path", () => {
    expect(isValidShopDomain("https://mystore.myshopify.com/admin")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidShopDomain("")).toBe(false);
  });

  it("rejects a domain starting with a hyphen", () => {
    expect(isValidShopDomain("-mystore.myshopify.com")).toBe(false);
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes client_id, scope, redirect_uri, and state", () => {
    const url = buildAuthorizeUrl("mystore.myshopify.com", "abc123");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://mystore.myshopify.com/admin/oauth/authorize"
    );
    expect(parsed.searchParams.get("client_id")).toBe("test_client_id");
    expect(parsed.searchParams.get("scope")).toBe(SHOPIFY_OAUTH_SCOPES);
    expect(parsed.searchParams.get("redirect_uri")).toBe(getOAuthCallbackUrl());
    expect(parsed.searchParams.get("state")).toBe("abc123");
  });
});

describe("verifyOAuthHmac", () => {
  function signedParams(extra: Record<string, string>): URLSearchParams {
    const base = new URLSearchParams(extra);
    const message = Array.from(base.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const hmac = createHmac("sha256", "test_client_secret").update(message).digest("hex");
    base.set("hmac", hmac);
    return base;
  }

  it("accepts a correctly signed query string", () => {
    const params = signedParams({ shop: "mystore.myshopify.com", state: "abc123", code: "xyz" });
    expect(verifyOAuthHmac(params)).toBe(true);
  });

  it("rejects a missing hmac param", () => {
    const params = new URLSearchParams({ shop: "mystore.myshopify.com" });
    expect(verifyOAuthHmac(params)).toBe(false);
  });

  it("rejects a tampered param not reflected in the signature", () => {
    const params = signedParams({ shop: "mystore.myshopify.com", state: "abc123", code: "xyz" });
    params.set("shop", "attacker.myshopify.com");
    expect(verifyOAuthHmac(params)).toBe(false);
  });

  it("rejects a garbage hmac value", () => {
    const params = new URLSearchParams({ shop: "mystore.myshopify.com", hmac: "not-a-real-hmac" });
    expect(verifyOAuthHmac(params)).toBe(false);
  });
});
