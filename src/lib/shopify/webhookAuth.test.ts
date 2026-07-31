import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { verifyShopifyWebhook } from "./webhookAuth";

describe("verifyShopifyWebhook", () => {
  const secret = "shpss_test_secret";
  const rawBody = JSON.stringify({ id: 123, title: "Test Product" });

  function sign(body: string, key: string): string {
    return createHmac("sha256", key).update(body, "utf8").digest("base64");
  }

  it("returns true for a valid signature", () => {
    const signature = sign(rawBody, secret);
    expect(verifyShopifyWebhook(rawBody, signature, secret)).toBe(true);
  });

  it("returns false for a signature signed with the wrong secret", () => {
    const signature = sign(rawBody, "wrong-secret");
    expect(verifyShopifyWebhook(rawBody, signature, secret)).toBe(false);
  });

  it("returns false when the body has been tampered with", () => {
    const signature = sign(rawBody, secret);
    const tamperedBody = JSON.stringify({ id: 123, title: "Tampered" });
    expect(verifyShopifyWebhook(tamperedBody, signature, secret)).toBe(false);
  });

  it("returns false for a missing/empty signature", () => {
    expect(verifyShopifyWebhook(rawBody, "", secret)).toBe(false);
  });

  it("returns false for a malformed (non-base64) signature without throwing", () => {
    expect(verifyShopifyWebhook(rawBody, "not-valid-base64!!!", secret)).toBe(false);
  });
});
