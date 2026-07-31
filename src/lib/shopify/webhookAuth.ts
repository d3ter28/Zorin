import { createHmac, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Shopify's X-Shopify-Hmac-Sha256 header: base64 HMAC-SHA256 of the
 * raw request body, signed with the merchant's custom app's API secret key.
 */
export function verifyShopifyWebhook(
  rawBody: string,
  signatureHeader: string,
  apiSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", apiSecret).update(rawBody, "utf8").digest("base64");
  try {
    return safeCompare(expected, signatureHeader);
  } catch {
    return false;
  }
}
