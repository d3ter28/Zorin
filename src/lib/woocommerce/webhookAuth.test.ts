import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { verifyWooWebhook, generateWooWebhookSecret } from "./webhookAuth";

describe("verifyWooWebhook", () => {
  const secret = "wc-webhook-secret";
  const rawBody = JSON.stringify({ id: 456, name: "Test Product" });

  function sign(body: string, key: string): string {
    return createHmac("sha256", key).update(body, "utf8").digest("base64");
  }

  it("returns true for a valid signature", () => {
    const signature = sign(rawBody, secret);
    expect(verifyWooWebhook(rawBody, signature, secret)).toBe(true);
  });

  it("returns false for a signature signed with the wrong secret", () => {
    const signature = sign(rawBody, "wrong-secret");
    expect(verifyWooWebhook(rawBody, signature, secret)).toBe(false);
  });

  it("returns false when the body has been tampered with", () => {
    const signature = sign(rawBody, secret);
    const tamperedBody = JSON.stringify({ id: 456, name: "Tampered" });
    expect(verifyWooWebhook(tamperedBody, signature, secret)).toBe(false);
  });

  it("returns false for a missing/empty signature", () => {
    expect(verifyWooWebhook(rawBody, "", secret)).toBe(false);
  });
});

describe("generateWooWebhookSecret", () => {
  it("returns a 64-character hex string", () => {
    const secret = generateWooWebhookSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different value on each call", () => {
    expect(generateWooWebhookSecret()).not.toBe(generateWooWebhookSecret());
  });
});
