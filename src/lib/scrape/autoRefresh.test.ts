import { describe, expect, it, vi } from "vitest";
import { findDueProductIds, runScheduledRefresh, REFRESH_AFTER_MS } from "./autoRefresh";
import type { RefreshSummary } from "./refreshProduct";

const NOW = new Date("2026-07-03T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

// Minimal mock of the prisma surface findDueProductIds uses.
function prismaWith(rows: Array<{ productId: string; competitorUrl: string | null; lastObservedAt: Date }>) {
  return {
    competitorPrice: {
      findMany: vi.fn(async ({ where }: { where: { competitorUrl: { not: null }; lastObservedAt: { lt: Date } } }) =>
        rows
          .filter((r) => r.competitorUrl !== null && r.lastObservedAt < where.lastObservedAt.lt)
          .map((r) => ({ productId: r.productId })),
      ),
    },
  } as never;
}

describe("findDueProductIds", () => {
  it("returns products with a URL-bearing competitor older than the threshold", async () => {
    const prisma = prismaWith([
      { productId: "p1", competitorUrl: "https://a.example", lastObservedAt: hoursAgo(25) },
      { productId: "p2", competitorUrl: "https://b.example", lastObservedAt: hoursAgo(23) },
    ]);
    expect(await findDueProductIds(prisma, NOW)).toEqual(["p1"]);
  });

  it("ignores URL-less competitors no matter how old", async () => {
    const prisma = prismaWith([
      { productId: "p1", competitorUrl: null, lastObservedAt: hoursAgo(100) },
    ]);
    expect(await findDueProductIds(prisma, NOW)).toEqual([]);
  });

  it("deduplicates product ids when several competitors are due", async () => {
    const prisma = prismaWith([
      { productId: "p1", competitorUrl: "https://a.example", lastObservedAt: hoursAgo(30) },
      { productId: "p1", competitorUrl: "https://b.example", lastObservedAt: hoursAgo(40) },
      { productId: "p2", competitorUrl: "https://c.example", lastObservedAt: hoursAgo(30) },
    ]);
    expect(await findDueProductIds(prisma, NOW)).toEqual(["p1", "p2"]);
  });

  it("exports a 24h threshold", () => {
    expect(REFRESH_AFTER_MS).toBe(24 * 60 * 60 * 1000);
  });
});

function summary(productId: string, refreshed: number, failed: number): RefreshSummary {
  return { productId, refreshed, failed, results: [] };
}

describe("runScheduledRefresh", () => {
  const duePrisma = prismaWith([
    { productId: "p1", competitorUrl: "https://a.example", lastObservedAt: hoursAgo(30) },
    { productId: "p2", competitorUrl: "https://b.example", lastObservedAt: hoursAgo(30) },
  ]);

  it("refreshes every due product and aggregates counts", async () => {
    const refreshProduct = vi
      .fn()
      .mockResolvedValueOnce(summary("p1", 2, 1))
      .mockResolvedValueOnce(summary("p2", 3, 0));
    const res = await runScheduledRefresh(duePrisma, NOW, { refreshProduct });
    expect(res).toEqual({ products: 2, refreshed: 5, failed: 1 });
    expect(refreshProduct).toHaveBeenCalledWith(duePrisma, "p1");
    expect(refreshProduct).toHaveBeenCalledWith(duePrisma, "p2");
  });

  it("logs one summary line", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const refreshProduct = vi.fn(async (_p: unknown, id: string) => summary(id, 1, 0));
    await runScheduledRefresh(duePrisma, NOW, { refreshProduct });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[auto-refresh] 2 products: refreshed 2, failed 0");
    log.mockRestore();
  });

  it("counts a throwing product as failed and continues to the next", async () => {
    const refreshProduct = vi
      .fn()
      .mockRejectedValueOnce(new Error("db hiccup"))
      .mockResolvedValueOnce(summary("p2", 4, 0));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await runScheduledRefresh(duePrisma, NOW, { refreshProduct });
    expect(res).toEqual({ products: 2, refreshed: 4, failed: 1 });
    log.mockRestore();
  });

  it("does nothing (but still logs) when no products are due", async () => {
    const empty = prismaWith([]);
    const refreshProduct = vi.fn();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await runScheduledRefresh(empty, NOW, { refreshProduct });
    expect(res).toEqual({ products: 0, refreshed: 0, failed: 0 });
    expect(refreshProduct).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
