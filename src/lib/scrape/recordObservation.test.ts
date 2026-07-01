import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordObservation } from "./recordObservation";

interface Projection {
  productId: string;
  competitorName: string;
  competitorUrl: string | null;
  price: number;
  lastObservedAt: Date;
  isStale: boolean;
}

const projections = new Map<string, Projection>();
const observations: unknown[] = [];

const key = (p: string, c: string) => `${p}::${c}`;

const prisma = {
  competitorPriceObservation: {
    create: vi.fn(async ({ data }: { data: unknown }) => {
      observations.push(data);
      return data;
    }),
  },
  competitorPrice: {
    upsert: vi.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { productId_competitorName: { productId: string; competitorName: string } };
        create: Projection;
        update: Partial<Projection>;
      }) => {
        const { productId, competitorName } = where.productId_competitorName;
        const k = key(productId, competitorName);
        const existing = projections.get(k);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { ...create };
        projections.set(k, row);
        return row;
      },
    ),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  projections.clear();
  observations.length = 0;
  vi.clearAllMocks();
});

describe("recordObservation", () => {
  it("writes a history row and upserts the projection", async () => {
    await recordObservation(prisma, {
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      priceCents: 2500,
      source: "scrape",
      now: new Date("2026-06-30T00:00:00.000Z"),
    });

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      productId: "p1",
      competitorName: "Acme",
      price: 2500,
      source: "scrape",
    });

    const proj = projections.get("p1::Acme")!;
    expect(proj.price).toBe(2500);
    expect(proj.isStale).toBe(false);
    expect(proj.competitorUrl).toBe("https://acme/p");
  });

  it("clears staleness and updates lastObservedAt on a repeat observation", async () => {
    projections.set("p1::Acme", {
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      price: 2000,
      lastObservedAt: new Date("2026-01-01T00:00:00.000Z"),
      isStale: true,
    });

    await recordObservation(prisma, {
      productId: "p1",
      competitorName: "Acme",
      competitorUrl: "https://acme/p",
      priceCents: 2600,
      source: "scrape",
      now: new Date("2026-06-30T00:00:00.000Z"),
    });

    const proj = projections.get("p1::Acme")!;
    expect(proj.price).toBe(2600);
    expect(proj.isStale).toBe(false);
    expect(proj.lastObservedAt).toEqual(new Date("2026-06-30T00:00:00.000Z"));
  });
});
