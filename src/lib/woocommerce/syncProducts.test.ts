import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncWooProducts } from "./syncProducts";
import type { WooNormalizedProduct } from "./client";

function mockPrisma(existing: { id: string; sku: string }[] = []) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    recommendation: { deleteMany: vi.fn().mockResolvedValue({}) },
  };
}

function product(over: Partial<WooNormalizedProduct> = {}): WooNormalizedProduct {
  return {
    id: 101,
    parentId: null,
    name: "Test Shirt",
    sku: "SHIRT-001",
    regularPriceDollars: "19.99",
    imageUrl: null,
    category: null,
    ...over,
  } as WooNormalizedProduct;
}

describe("syncWooProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Create new simple product ─────────────────────────────────────────────

  it("creates a new simple product with correct fields", async () => {
    const prisma = mockPrisma([]);
    const result = await syncWooProducts(prisma as never, "m1", [product()]);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "SHIRT-001",
        title: "Test Shirt",
        currentPrice: 1999,
        woocommerceVariantId: "101",
        woocommerceParentId: null,
        imageUrl: null,
        category: "Uncategorized",
      },
    });
    expect(result).toEqual({ created: 1, updated: 0, skipped: 0, skippedReasons: [] });
  });

  // ── Category persistence ──────────────────────────────────────────────────

  it("persists the real category from the product on create", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ category: "Shirts" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Shirts" }),
      }),
    );
  });

  it("falls back to Uncategorized when category is null", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ category: null }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Uncategorized" }),
      }),
    );
  });

  it("falls back to Uncategorized when category is empty/whitespace", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ category: "   " }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Uncategorized" }),
      }),
    );
  });

  // ── SKU skip logic ────────────────────────────────────────────────────────

  it("skips products with empty SKU and records reason", async () => {
    const prisma = mockPrisma([]);
    const result = await syncWooProducts(prisma as never, "m1", [
      product({ id: 999, sku: "", name: "No SKU Product" }),
    ]);

    expect(result.skipped).toBe(1);
    expect(result.skippedReasons).toHaveLength(1);
    expect(result.skippedReasons[0]).toContain("999");
    expect(result.created).toBe(0);
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it("skips products with whitespace-only SKU and records reason", async () => {
    const prisma = mockPrisma([]);
    const result = await syncWooProducts(prisma as never, "m1", [
      product({ id: 888, sku: "   ", name: "Whitespace SKU" }),
    ]);

    expect(result.skipped).toBe(1);
    expect(result.skippedReasons).toHaveLength(1);
    expect(result.skippedReasons[0]).toContain("888");
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  // ── Update existing by SKU ────────────────────────────────────────────────

  it("updates an existing product matched by SKU", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "SHIRT-001" }]);
    const result = await syncWooProducts(prisma as never, "m1", [
      product({ id: 202, sku: "SHIRT-001", regularPriceDollars: "34.99" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        title: "Test Shirt",
        currentPrice: 3499,
        woocommerceVariantId: "202",
        woocommerceParentId: null,
        imageUrl: null,
      },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0, updated: 1, skipped: 0, skippedReasons: [] });
  });

  it("matches SKU case-insensitively", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "shirt-001" }]);
    const result = await syncWooProducts(prisma as never, "m1", [
      product({ sku: "SHIRT-001" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalled();
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  // ── Recommendation invalidation ────────────────────────────────────────────

  it("invalidates recommendations for updated products", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "SHIRT-001" }]);
    await syncWooProducts(prisma as never, "m1", [product({ sku: "SHIRT-001" })]);

    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1"] } },
    });
  });

  it("does not call deleteMany when no products were updated", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [product()]);

    expect(prisma.recommendation.deleteMany).not.toHaveBeenCalled();
  });

  // ── Variation parentId handling ───────────────────────────────────────────

  it("sets woocommerceParentId correctly for variation products", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ id: 505, parentId: 200, sku: "VAR-001", name: "Shirt - Red" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          woocommerceVariantId: "505",
          woocommerceParentId: "200",
        }),
      }),
    );
  });

  it("sets woocommerceParentId = null for simple products", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ id: 101, parentId: null }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          woocommerceVariantId: "101",
          woocommerceParentId: null,
        }),
      }),
    );
  });

  // ── Mixed batch ───────────────────────────────────────────────────────────

  it("handles a mixed batch: create, update, and skip", async () => {
    const prisma = mockPrisma([{ id: "p2", sku: "EXISTING-SKU" }]);
    const result = await syncWooProducts(prisma as never, "m1", [
      product({ id: 1, sku: "NEW-SKU", name: "New Product" }),
      product({ id: 2, sku: "EXISTING-SKU", name: "Old Product" }),
      product({ id: 3, sku: "", name: "No SKU Product" }),
    ]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.skippedReasons).toHaveLength(1);
    expect(prisma.product.create).toHaveBeenCalledTimes(1);
    expect(prisma.product.update).toHaveBeenCalledTimes(1);
  });

  // ── Image URL persistence ─────────────────────────────────────────────────

  it("persists imageUrl from the product on create", async () => {
    const prisma = mockPrisma([]);
    await syncWooProducts(prisma as never, "m1", [
      product({ imageUrl: "https://example.com/photo.jpg" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://example.com/photo.jpg" }),
      }),
    );
  });

  it("overwrites imageUrl on re-sync when the merchant's photo changed", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "SHIRT-001" }]);
    await syncWooProducts(prisma as never, "m1", [
      product({ sku: "SHIRT-001", imageUrl: "https://example.com/new-photo.jpg" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://example.com/new-photo.jpg" }),
      }),
    );
  });

  // ── Empty input ───────────────────────────────────────────────────────────

  it("returns zeros and does not query DB for empty input", async () => {
    const prisma = mockPrisma([]);
    const result = await syncWooProducts(prisma as never, "m1", []);

    expect(result).toEqual({ created: 0, updated: 0, skipped: 0, skippedReasons: [] });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
