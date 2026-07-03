import { describe, expect, it } from "vitest";
import { PrivateIpError, isPrivateIpError } from "./pinnedAgent";

describe("isPrivateIpError", () => {
  it("detects a direct PrivateIpError", () => {
    expect(isPrivateIpError(new PrivateIpError("internal.example", "10.0.0.5"))).toBe(true);
  });

  it("detects a PrivateIpError nested one level deep in cause", () => {
    const err = new TypeError("fetch failed", {
      cause: new PrivateIpError("internal.example", "127.0.0.1"),
    });
    expect(isPrivateIpError(err)).toBe(true);
  });

  it("detects a PrivateIpError nested two levels deep in cause", () => {
    const inner = new PrivateIpError("internal.example", "192.168.1.1");
    const mid = new Error("connect failed", { cause: inner });
    const outer = new TypeError("fetch failed", { cause: mid });
    expect(isPrivateIpError(outer)).toBe(true);
  });

  it("returns false for unrelated errors and non-errors", () => {
    expect(isPrivateIpError(new Error("ECONNRESET"))).toBe(false);
    expect(isPrivateIpError(new TypeError("fetch failed", { cause: new Error("boom") }))).toBe(false);
    expect(isPrivateIpError("nope")).toBe(false);
    expect(isPrivateIpError(undefined)).toBe(false);
  });

  it("includes hostname and address in the message", () => {
    const err = new PrivateIpError("internal.example", "10.0.0.5");
    expect(err.message).toContain("internal.example");
    expect(err.message).toContain("10.0.0.5");
    expect(err.name).toBe("PrivateIpError");
  });
});
