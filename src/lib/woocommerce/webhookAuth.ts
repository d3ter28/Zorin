import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies WooCommerce's X-WC-Webhook-Signature header: base64 HMAC-SHA256 of
 * the raw request body, signed with the secret Zorin generated and registered
 * with the webhook subscription.
 */
export function verifyWooWebhook(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("base64");
  try {
    return safeCompare(expected, signatureHeader);
  } catch {
    return false;
  }
}

/** Generates the secret Zorin uses when registering a WooCommerce webhook. */
export function generateWooWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
