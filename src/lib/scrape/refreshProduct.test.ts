import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshProduct } from "./refreshProduct";
import type { ScrapeResult } from "./scrapeOne";

interface Proj {
  id: string;
  productId: string;
  competitorName: string;
  competitorUrl: string | null;
  price: number;
  lastObservedAt: Date;
  isStale: boolean;
}

let projections: Proj[] = [];
const observations: unknown[] = [];
const deletedRecsFor: string[] = [];

const prisma = {
  competitorPrice: {
    findMany: vi.fn(async ({ where }: { where: { productId: string } }) =>
      projections.filter((p) => p.productId === where.productId),
    ),
    upsert: vi.fn(
      async ({
        where,
        update,
      }: {
        where: { productId_competitorName: { productId: string; competitorName: string } };
        create: Proj;
        update: Partial<Proj>;
      }) => {
        const { productId, competitorName } = where.productId_competitorName;
        const row = projections.find(
          (p) => p.productId === productId && p.competitorName === competitorName,
        );
        if (row) Object.assign(row, update);
        return row;
      },
    ),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Proj> }) => {
      const row = projections.find((p) => p.id === where.id);
      if (row) Object.assign(row, data);
      return row;
    }),
  },
  competitorPriceObservation: {
    create: vi.fn(async ({ data }: { data: unknown }) => {
      observations.push(data);
      return data;
    }),
  },
  recommendation: {
    deleteMany: vi.fn(async ({ where }: { where: { productId: string } }) => {
      deletedRecsFor.push(where.productId);
      return { count: 1 };
    }),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  observations.length = 0;
  deletedRecsFor.length = 0;
  projections = [
    {
      id: "c1",
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      price: 2000,
      lastObservedAt: new Date("2026-06-29T00:00:00.000Z"),
      isStale: false,
    },
    {
      id: "c2",
      productId: "p1",
      competitorName: "Globex",
      competitorUrl: "https://globex/p",
      price: 3000,
      lastObservedAt: new Date("2026-06-29T00:00:00.000Z"),
      isStale: false,
    },
  ];
  vi.clearAllMocks();
});

const now = new Date("2026-06-30T00:00:00.000Z");

describe("refreshProduct", () => {
  it("updates competitors that scrape successfully", async () => {
    const scrapeOne = vi.fn(
      async (url: string): Promise<ScrapeResult> =>
        url.includes("acme")
          ? { ok: true, priceCents: 2100 }
          : { ok: true, priceCents: 3100 },
    );

    const summary = await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(summary).toMatchObject({ refreshed: 2, failed: 0 });
    expect(projections.find((p) => p.id === "c1")!.price).toBe(2100);
    expect(projections.find((p) => p.id === "c2")!.price).toBe(3100);
    expect(observations).toHaveLength(2);
    expect(deletedRecsFor).toEqual(["p1"]); // recommendation invalidated
  });

  it("preserves the last good price when a competitor fails", async () => {
    const scrapeOne = vi.fn(
      async (url: string): Promise<ScrapeResult> =>
        url.includes("acme")
          ? { ok: true, priceCents: 2100 }
          : { ok: false, reason: "http_404" },
    );

    const summary = await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(summary).toMatchObject({ refreshed: 1, failed: 1 });
    expect(projections.find((p) => p.id === "c1")!.price).toBe(2100); // updated
    expect(projections.find((p) => p.id === "c2")!.price).toBe(3000); // untouched
    expect(observations).toHaveLength(1);
    expect(summary.results.find((r) => r.competitorName === "Globex")).toMatchObject({
      ok: false,
      reason: "http_404",
    });
  });

  it("recomputes staleness after refreshing", async () => {
    // Globex hasn't been confirmed in 20 days -> should be marked stale, and a
    // failed scrape must not rescue it.
    projections.find((p) => p.id === "c2")!.lastObservedAt = new Date(
      now.getTime() - 20 * 24 * 60 * 60 * 1000,
    );
    const scrapeOne = vi.fn(
      async (url: string): Promise<ScrapeResult> =>
        url.includes("acme")
          ? { ok: true, priceCents: 2100 }
          : { ok: false, reason: "timeout" },
    );

    await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(projections.find((p) => p.id === "c2")!.isStale).toBe(true);
    expect(projections.find((p) => p.id === "c1")!.isStale).toBe(false);
  });

  it("skips competitors without a URL", async () => {
    projections.find((p) => p.id === "c2")!.competitorUrl = null;
    const scrapeOne = vi.fn(async (): Promise<ScrapeResult> => ({ ok: true, priceCents: 2100 }));

    const summary = await refreshProduct(prisma, "p1", { scrapeOne, now });

    expect(scrapeOne).toHaveBeenCalledTimes(1); // only Acme
    expect(summary.results.find((r) => r.competitorName === "Globex")).toMatchObject({
      ok: false,
      reason: "no_url",
    });
  });
});
