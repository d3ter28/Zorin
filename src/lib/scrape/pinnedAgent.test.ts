import { describe, expect, it } from "vitest";
import { Agent } from "undici";
import { PrivateIpError, isPrivateIpError, makeGuardedLookup, getPinnedAgent } from "./pinnedAgent";
import type { LookupFn } from "./pinnedAgent";

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

// Promisify a guarded lookup call for assertions.
function callLookup(
  lookup: LookupFn,
  hostname: string,
  options: Record<string, unknown> = {},
): Promise<{ err: unknown; result: unknown; family: unknown }> {
  return new Promise((resolve) => {
    (lookup as (h: string, o: object, cb: (...args: unknown[]) => void) => void)(
      hostname,
      options,
      (err, result, family) => resolve({ err, result, family }),
    );
  });
}

// Base lookup stub answering with a single (address, family) pair.
function baseSingle(address: string): LookupFn {
  return ((_h: string, _o: object, cb: (...args: unknown[]) => void) =>
    cb(null, address, 4)) as unknown as LookupFn;
}

// Base lookup stub answering with an all:true style address array.
function baseAll(addresses: string[]): LookupFn {
  return ((_h: string, _o: object, cb: (...args: unknown[]) => void) =>
    cb(null, addresses.map((address) => ({ address, family: 4 })))) as unknown as LookupFn;
}

describe("makeGuardedLookup", () => {
  it("passes a public single address through unchanged", async () => {
    const lookup = makeGuardedLookup(baseSingle("93.184.216.34"));
    const { err, result, family } = await callLookup(lookup, "shop.example");
    expect(err).toBeNull();
    expect(result).toBe("93.184.216.34");
    expect(family).toBe(4);
  });

  it("fails with PrivateIpError for a private single address", async () => {
    const lookup = makeGuardedLookup(baseSingle("10.0.0.5"));
    const { err } = await callLookup(lookup, "internal.example");
    expect(isPrivateIpError(err)).toBe(true);
  });

  it("passes an all-public address array through unchanged", async () => {
    const lookup = makeGuardedLookup(baseAll(["93.184.216.34", "1.1.1.1"]));
    const { err, result } = await callLookup(lookup, "shop.example", { all: true });
    expect(err).toBeNull();
    expect(result).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "1.1.1.1", family: 4 },
    ]);
  });

  it("fails when any address in a mixed array is private", async () => {
    const lookup = makeGuardedLookup(baseAll(["93.184.216.34", "192.168.1.7"]));
    const { err } = await callLookup(lookup, "rebind.example", { all: true });
    expect(isPrivateIpError(err)).toBe(true);
  });

  it("propagates base lookup errors untouched", async () => {
    const boom = new Error("ENOTFOUND");
    const failing = ((_h: string, _o: object, cb: (...args: unknown[]) => void) =>
      cb(boom)) as unknown as LookupFn;
    const lookup = makeGuardedLookup(failing);
    const { err } = await callLookup(lookup, "missing.example");
    expect(err).toBe(boom);
  });
});

describe("getPinnedAgent", () => {
  it("returns a lazily created undici Agent singleton", () => {
    const first = getPinnedAgent();
    expect(first).toBeInstanceOf(Agent);
    expect(getPinnedAgent()).toBe(first);
  });
});
