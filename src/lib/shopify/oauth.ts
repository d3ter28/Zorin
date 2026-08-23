import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/appConfig";

// Must exactly match the scopes granted in the app's Dev Dashboard config.
export const SHOPIFY_OAUTH_SCOPES = "read_orders,read_products,write_products";

const SHOP_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export function isValidShopDomain(shop: string): boolean {
  return SHOP_DOMAIN_PATTERN.test(shop);
}

function getApiKey(): string {
  const key = process.env.SHOPIFY_API_KEY;
  if (!key) throw new Error("SHOPIFY_API_KEY is not set");
  return key;
}

function getApiSecret(): string {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error("SHOPIFY_API_SECRET is not set");
  return secret;
}

export function getOAuthCallbackUrl(): string {
  return `${getAppUrl()}/api/shopify/oauth/callback`;
}

export function buildAuthorizeUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getApiKey(),
    scope: SHOPIFY_OAUTH_SCOPES,
    redirect_uri: getOAuthCallbackUrl(),
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// Verifies the HMAC Shopify signs onto the OAuth callback query string.
// Different algorithm from webhook body verification: sort the query params
// (excluding hmac) alphabetically by key, join as "key=value" pairs with "&",
// then HMAC-SHA256 that string (hex digest) with the app's client secret.
export function verifyOAuthHmac(searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const params = new URLSearchParams(searchParams);
  params.delete("hmac");

  const message = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = createHmac("sha256", getApiSecret()).update(message).digest("hex");

  const digestBuf = Buffer.from(digest, "utf8");
  const hmacBuf = Buffer.from(hmac, "utf8");
  if (digestBuf.length !== hmacBuf.length) return false;
  return timingSafeEqual(digestBuf, hmacBuf);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: getApiKey(),
      client_secret: getApiSecret(),
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; scope: string };
  return { accessToken: data.access_token, scope: data.scope };
}

/** The app's own client secret, used to verify webhook HMACs for OAuth-connected shops. */
export function getAppClientSecret(): string {
  return getApiSecret();
}
