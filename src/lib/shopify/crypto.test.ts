import { describe, it, expect, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "./crypto";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.SHOPIFY_ENCRYPTION_KEY = randomBytes(32).toString("hex");
});

describe("encryptToken / decryptToken", () => {
  it("round-trips a token", () => {
    const token = "shpat_abc123xyz";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("produces different ciphertexts for same input", () => {
    const token = "shpat_abc123xyz";
    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("shpat_test");
    const parts = encrypted.split(":");
    parts[1] = "00".repeat(parts[1].length / 2); // tamper ciphertext
    expect(() => decryptToken(parts.join(":"))).toThrow();
  });

  it("throws on malformed input", () => {
    expect(() => decryptToken("not:enough")).toThrow();
    expect(() => decryptToken("")).toThrow();
  });

  it("throws if SHOPIFY_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.SHOPIFY_ENCRYPTION_KEY;
    delete process.env.SHOPIFY_ENCRYPTION_KEY;
    expect(() => encryptToken("test")).toThrow(/SHOPIFY_ENCRYPTION_KEY/);
    process.env.SHOPIFY_ENCRYPTION_KEY = saved;
  });
});
