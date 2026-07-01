import { beforeEach, describe, expect, it, vi } from "vitest";
import { isStale, markStale, STALE_AFTER_MS } from "./staleness";

describe("isStale", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  it("is false exactly at the threshold", () => {
    const at = new Date(now.getTime() - STALE_AFTER_MS);
    expect(isStale(at, now)).toBe(false);
  });
  it("is true just past the threshold", () => {
    const at = new Date(now.getTime() - STALE_AFTER_MS - 1);
    expect(isStale(at, now)).toBe(true);
  });
  it("is false for a fresh observation", () => {
    expect(isStale(now, now)).toBe(false);
  });
});

describe("markStale", () => {
  it("flags only projections older than the threshold", async () => {
    const now = new Date("2026-06-30T00:00:00.000Z");
    const fresh = { id: "a", lastObservedAt: now, isStale: false };
    const old = {
      id: "b",
      lastObservedAt: new Date(now.getTime() - STALE_AFTER_MS - 1000),
      isStale: false,
    };
    const findMany = vi.fn(async () => [fresh, old]);
    const update = vi.fn(async () => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = { competitorPrice: { findMany, update } } as any;

    await markStale(prisma, "p1", now);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: "b" }, data: { isStale: true } });
  });
});
