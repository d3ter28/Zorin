import { describe, expect, it, vi } from "vitest";
import { findDueProductIds, REFRESH_AFTER_MS } from "./autoRefresh";

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
