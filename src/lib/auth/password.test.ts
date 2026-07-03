import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("hunter22");
    expect(hash).not.toContain("hunter22");
    await expect(verifyPassword("hunter22", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("hunter22");
    await expect(verifyPassword("hunter23", hash)).resolves.toBe(false);
  });

  it("returns false (never throws) for a malformed hash", async () => {
    await expect(verifyPassword("hunter22", "not-a-hash")).resolves.toBe(false);
  });
});
