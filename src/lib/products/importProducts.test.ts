import { beforeEach, describe, expect, it, vi } from "vitest";
import { importProducts } from "./importProducts";
import type { ProductParseResult } from "./parseProductCsv";

function mockPrisma(existing: { id: string; sku: string; cogs?: number | null }[]) {
  const p = {
    product: {
      findMany: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({ id: "new-id" }),
      update: vi.fn().mockResolvedValue({}),
    },
    recommendation: { deleteMany: vi.fn().mockResolvedValue({}) },
    cogsChange: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return arg(p);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return p;
}

const parsed = (
  rows: ProductParseResult["rows"],
  errors: ProductParseResult["errors"] = [],
): ProductParseResult => ({ rows, errors });

const row = (over: Partial<ProductParseResult["rows"][number]> = {}) => ({
  line: 1,
  sku: "TEE-100",
  title: "Linen Shirt",
  currentPriceCents: 4999,
  category: "Apparel",
  cogsCents: 1800,
  estUnits: 40,
  imageUrl: null,
  ...over,
});

describe("importProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates products whose sku is not yet in the merchant catalog", async () => {
    const prisma = mockPrisma([]);
    const result = await importProducts(prisma as never, "m1", parsed([row()]));

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPrice: 4999,
        category: "Apparel",
        cogs: 1800,
        estUnits: 40,
        imageUrl: null,
      },
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("updates an existing product matched by sku and invalidates its recommendation", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    const result = await importProducts(
      prisma as never,
      "m1",
      parsed([row({ currentPriceCents: 5200, cogsCents: null, estUnits: null })]),
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        title: "Linen Shirt",
        currentPrice: 5200,
        category: "Apparel",
        cogs: null,
        estUnits: null,
        imageUrl: null,
      },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1"] } },
    });
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(1);
  });

  it("does not invalidate recommendations when nothing was updated", async () => {
    const prisma = mockPrisma([]);
    await importProducts(prisma as never, "m1", parsed([row()]));
    expect(prisma.recommendation.deleteMany).not.toHaveBeenCalled();
  });

  it("carries parser errors through into the summary", async () => {
    const prisma = mockPrisma([]);
    const result = await importProducts(
      prisma as never,
      "m1",
      parsed([], [{ line: 3, raw: "bad,row", reason: "malformed line: expected 6 or 7 columns" }]),
    );
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  // ── image_url persistence ─────────────────────────────────────────────────

  it("persists imageUrl from the row on create", async () => {
    const prisma = mockPrisma([]);
    await importProducts(
      prisma as never,
      "m1",
      parsed([row({ imageUrl: "https://cdn.example.com/shirt.jpg" })]),
    );

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.example.com/shirt.jpg" }),
      }),
    );
  });

  it("overwrites imageUrl on re-import when it changed", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    await importProducts(
      prisma as never,
      "m1",
      parsed([row({ imageUrl: "https://cdn.example.com/new-shirt.jpg" })]),
    );

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.example.com/new-shirt.jpg" }),
      }),
    );
  });

  // ── CogsChange audit ─────────────────────────────────────────────────────────

  it("logs a CogsChange when an imported row changes an existing product's cogs", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100", cogs: 1000 }]);
    await importProducts(prisma as never, "m1", parsed([row({ cogsCents: 2000 })]));
    expect(prisma.cogsChange.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", fromCents: 1000, toCents: 2000, source: "csv_import" },
    });
  });

  it("does NOT log a CogsChange when imported cogs matches existing", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100", cogs: 1800 }]);
    await importProducts(prisma as never, "m1", parsed([row({ cogsCents: 1800 })]));
    expect(prisma.cogsChange.create).not.toHaveBeenCalled();
  });

  it("logs a first-set CogsChange (fromCents null) for a newly created product", async () => {
    const prisma = mockPrisma([]);
    await importProducts(prisma as never, "m1", parsed([row({ sku: "NEW-SKU", cogsCents: 3000 })]));
    expect(prisma.cogsChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromCents: null, toCents: 3000, source: "csv_import", merchantId: "m1" }),
    });
  });
});
