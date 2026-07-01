import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyIngest } from "./applyIngest";
import type { ParseResult } from "./parseCsv";

function mockPrisma(opts: {
  products: { id: string; sku: string }[];
  existing?: { productId: string; competitorName: string }[];
}) {
  return {
    product: { findMany: vi.fn().mockResolvedValue(opts.products) },
    competitorPrice: {
      findMany: vi.fn().mockResolvedValue(opts.existing ?? []),
      upsert: vi.fn().mockResolvedValue({}),
    },
    recommendation: { deleteMany: vi.fn().mockResolvedValue({}) },
    competitorPriceObservation: { create: vi.fn().mockResolvedValue({}) },
  };
}

const parsed = (rows: ParseResult["rows"], errors: ParseResult["errors"] = []): ParseResult => ({
  rows,
  errors,
});

describe("applyIngest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts each matched row and counts inserts vs updates", async () => {
    const prisma = mockPrisma({
      products: [{ id: "p1", sku: "TEE-001" }],
      existing: [{ productId: "p1", competitorName: "RivalShop" }],
    });
    const result = await applyIngest(prisma as never, parsed([
      { line: 1, sku: "TEE-001", competitorName: "RivalShop", priceCents: 2850 }, // exists -> update
      { line: 2, sku: "TEE-001", competitorName: "MarketCo", priceCents: 3000 },  // new -> insert
    ]));

    expect(prisma.competitorPrice.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.competitorPrice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId_competitorName: { productId: "p1", competitorName: "RivalShop" } },
        create: expect.objectContaining({
          productId: "p1",
          competitorName: "RivalShop",
          price: 2850,
          competitorUrl: "",
          isStale: false,
        }),
        update: expect.objectContaining({ price: 2850 }),
      }),
    );
    expect(prisma.competitorPriceObservation.create).toHaveBeenCalledTimes(2);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("invalidates recommendations only for touched products", async () => {
    const prisma = mockPrisma({ products: [{ id: "p1", sku: "TEE-001" }] });
    await applyIngest(prisma as never, parsed([
      { line: 1, sku: "TEE-001", competitorName: "RivalShop", priceCents: 2850 },
    ]));
    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1"] } },
    });
  });

  it("reports unknown SKUs as skipped errors and does not upsert them", async () => {
    const prisma = mockPrisma({ products: [] });
    const result = await applyIngest(prisma as never, parsed([
      { line: 1, sku: "NOPE-999", competitorName: "RivalShop", priceCents: 2850 },
    ]));
    expect(prisma.competitorPrice.upsert).not.toHaveBeenCalled();
    expect(prisma.competitorPriceObservation.create).not.toHaveBeenCalled();
    expect(prisma.recommendation.deleteMany).not.toHaveBeenCalled();
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatchObject({ line: 1, reason: expect.stringMatching(/unknown sku/i) });
  });

  it("carries parser errors through into the summary", async () => {
    const prisma = mockPrisma({ products: [] });
    const result = await applyIngest(prisma as never, parsed([], [
      { line: 4, raw: "bad,row,abc", reason: "invalid price" },
    ]));
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
