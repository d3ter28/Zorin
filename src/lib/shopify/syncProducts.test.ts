import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncProducts } from "./syncProducts";
import type { ShopifyVariant } from "./client";

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

function variant(over: Partial<ShopifyVariant> = {}): ShopifyVariant {
  return {
    id: 1001,
    product_id: 500,
    title: "Default Title",
    product_title: "Linen Shirt",
    sku: "TEE-100",
    price: "29.99",
    inventory_quantity: 10,
    imageUrl: null,
    ...over,
  };
}

describe("syncProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Title logic ────────────────────────────────────────────────────────────

  it("uses product_title alone when variant title is 'Default Title'", async () => {
    const prisma = mockPrisma();
    await syncProducts(prisma as never, "m1", [
      variant({ title: "Default Title", product_title: "Linen Shirt" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Linen Shirt" }),
      }),
    );
  });

  it("combines product_title and variant title when not 'Default Title'", async () => {
    const prisma = mockPrisma();
    await syncProducts(prisma as never, "m1", [
      variant({ title: "Small", product_title: "Linen Shirt" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Linen Shirt - Small" }),
      }),
    );
  });

  // ── SKU skip logic ─────────────────────────────────────────────────────────

  it("skips variants with empty SKU and records reason", async () => {
    const prisma = mockPrisma();
    const result = await syncProducts(prisma as never, "m1", [
      variant({ sku: "", id: 999, product_title: "No SKU Product" }),
    ]);

    expect(result.skipped).toBe(1);
    expect(result.skippedReasons).toHaveLength(1);
    expect(result.skippedReasons[0]).toContain("999");
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("skips variants with whitespace-only SKU", async () => {
    const prisma = mockPrisma();
    const result = await syncProducts(prisma as never, "m1", [
      variant({ sku: "   " }),
    ]);

    expect(result.skipped).toBe(1);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  // ── Create new products ───────────────────────────────────────────────────

  it("creates a new product for an unmatched variant", async () => {
    const prisma = mockPrisma([]);
    const result = await syncProducts(prisma as never, "m1", [variant()]);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        merchantId: "m1",
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPrice: 2999,
        shopifyVariantId: "1001",
        imageUrl: null,
        category: "Shopify",
      },
    });
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("converts price string to cents correctly", async () => {
    const prisma = mockPrisma([]);
    await syncProducts(prisma as never, "m1", [variant({ price: "49.99" })]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentPrice: 4999 }),
      }),
    );
  });

  // ── Update existing products (SKU match) ──────────────────────────────────

  it("updates an existing product matched by SKU", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    const result = await syncProducts(prisma as never, "m1", [
      variant({ id: 1001, sku: "TEE-100", price: "34.99" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        title: "Linen Shirt",
        currentPrice: 3499,
        shopifyVariantId: "1001",
        imageUrl: null,
      },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  it("matches SKU case-insensitively", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "tee-100" }]);
    const result = await syncProducts(prisma as never, "m1", [
      variant({ sku: "TEE-100" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalled();
    expect(result.updated).toBe(1);
  });

  // ── Recommendation invalidation ────────────────────────────────────────────

  it("invalidates recommendations for updated products", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    await syncProducts(prisma as never, "m1", [variant({ sku: "TEE-100" })]);

    expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1"] } },
    });
  });

  it("does not call deleteMany when no products were updated", async () => {
    const prisma = mockPrisma([]);
    await syncProducts(prisma as never, "m1", [variant()]);

    expect(prisma.recommendation.deleteMany).not.toHaveBeenCalled();
  });

  // ── Mixed batch ───────────────────────────────────────────────────────────

  it("handles a mixed batch: create, update, and skip", async () => {
    const prisma = mockPrisma([{ id: "p2", sku: "EXISTING-SKU" }]);
    const result = await syncProducts(prisma as never, "m1", [
      variant({ id: 1, sku: "NEW-SKU", product_title: "New Product" }),
      variant({ id: 2, sku: "EXISTING-SKU", product_title: "Old Product" }),
      variant({ id: 3, sku: "", product_title: "No SKU" }),
    ]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.skippedReasons).toHaveLength(1);
  });

  // ── Image URL persistence ─────────────────────────────────────────────────

  it("persists imageUrl from the variant on create", async () => {
    const prisma = mockPrisma([]);
    await syncProducts(prisma as never, "m1", [
      variant({ imageUrl: "https://cdn.shopify.com/photo.jpg" }),
    ]);

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.shopify.com/photo.jpg" }),
      }),
    );
  });

  it("overwrites imageUrl on re-sync when the merchant's photo changed", async () => {
    const prisma = mockPrisma([{ id: "p1", sku: "TEE-100" }]);
    await syncProducts(prisma as never, "m1", [
      variant({ sku: "TEE-100", imageUrl: "https://cdn.shopify.com/new-photo.jpg" }),
    ]);

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://cdn.shopify.com/new-photo.jpg" }),
      }),
    );
  });

  // ── Return shape ──────────────────────────────────────────────────────────

  it("returns correct shape with zeros for empty input", async () => {
    const prisma = mockPrisma();
    const result = await syncProducts(prisma as never, "m1", []);

    expect(result).toEqual({
      created: 0,
      updated: 0,
      skipped: 0,
      skippedReasons: [],
    });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
