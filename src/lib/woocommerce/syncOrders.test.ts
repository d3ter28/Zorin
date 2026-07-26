import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncWooOrders } from "./syncOrders";
import type { WooOrder } from "./client";

// Helper to build a mock Prisma surface
function mockPrisma(
  products: { id: string; woocommerceVariantId: string | null }[] = [],
  existingSalesRecord: { id: string; unitsSold: number } | null = null,
) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(products),
    },
    salesRecord: {
      findUnique: vi.fn().mockResolvedValue(existingSalesRecord),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function order(over: Partial<WooOrder> = {}): WooOrder {
  return {
    id: 1001,
    date_created: "2024-03-15T10:30:00Z",
    line_items: [
      { product_id: 100, variation_id: 0, quantity: 2, price: "29.99" },
    ],
    ...over,
  };
}

describe("syncWooOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Simple product: match by product_id when variation_id === 0 ────────────

  it("matches simple product by product_id when variation_id is 0", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      null,
    );

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [{ product_id: 100, variation_id: 0, quantity: 2, price: "29.99" }],
      }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledWith({
      data: {
        productId: "p1",
        merchantId: "m1",
        date: new Date(Date.UTC(2024, 2, 15)), // March = month index 2
        unitsSold: 2,
        priceCents: 2999,
      },
    });
    expect(prisma.salesRecord.update).not.toHaveBeenCalled();
    expect(result.upserted).toBe(1);
    expect(result.skippedLineItems).toBe(0);
  });

  // ── Variation: match by variation_id when variation_id > 0 ────────────────

  it("matches variation by variation_id when variation_id is greater than 0", async () => {
    const prisma = mockPrisma(
      [{ id: "p2", woocommerceVariantId: "555" }],
      null,
    );

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [{ product_id: 100, variation_id: 555, quantity: 3, price: "19.99" }],
      }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledWith({
      data: {
        productId: "p2",
        merchantId: "m1",
        date: new Date(Date.UTC(2024, 2, 15)),
        unitsSold: 3,
        priceCents: 1999,
      },
    });
    expect(result.upserted).toBe(1);
    expect(result.skippedLineItems).toBe(0);
  });

  // ── Skipped line items: no matching product ────────────────────────────────

  it("skips line items with no matching product and increments skippedLineItems", async () => {
    const prisma = mockPrisma([], null);

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [
          { product_id: 999, variation_id: 0, quantity: 5, price: "9.99" },
        ],
      }),
    ]);

    expect(prisma.salesRecord.findUnique).not.toHaveBeenCalled();
    expect(prisma.salesRecord.create).not.toHaveBeenCalled();
    expect(result.upserted).toBe(0);
    expect(result.skippedLineItems).toBe(1);
  });

  it("counts multiple unmatched line items in skippedLineItems", async () => {
    const prisma = mockPrisma([], null);

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [
          { product_id: 111, variation_id: 0, quantity: 1, price: "5.00" },
          { product_id: 222, variation_id: 333, quantity: 2, price: "10.00" },
        ],
      }),
    ]);

    expect(result.skippedLineItems).toBe(2);
    expect(result.upserted).toBe(0);
  });

  // ── Aggregation: same product, same day ───────────────────────────────────

  it("aggregates multiple line items for the same product on the same day into one record", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      null,
    );

    await syncWooOrders(prisma as never, "m1", [
      order({
        id: 1001,
        line_items: [{ product_id: 100, variation_id: 0, quantity: 3, price: "29.99" }],
      }),
      order({
        id: 1002,
        line_items: [{ product_id: 100, variation_id: 0, quantity: 7, price: "29.99" }],
      }),
    ]);

    // Only one upsert call per (product, date)
    expect(prisma.salesRecord.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.salesRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitsSold: 10 }), // 3 + 7
      }),
    );
    expect(prisma.salesRecord.create).toHaveBeenCalledTimes(1);
  });

  it("aggregates multiple line items in the same order for the same product", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      null,
    );

    await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [
          { product_id: 100, variation_id: 0, quantity: 4, price: "29.99" },
          { product_id: 100, variation_id: 0, quantity: 6, price: "29.99" },
        ],
      }),
    ]);

    expect(prisma.salesRecord.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.salesRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitsSold: 10 }),
      }),
    );
  });

  // ── Additive upsert: increments existing unitsSold ────────────────────────

  it("additively increments existing sales records instead of replacing", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      { id: "sr1", unitsSold: 10 },
    );

    await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [{ product_id: 100, variation_id: 0, quantity: 2, price: "29.99" }],
      }),
    ]);

    expect(prisma.salesRecord.update).toHaveBeenCalledWith({
      where: { id: "sr1" },
      data: { unitsSold: 12 }, // 10 existing + 2 new
    });
    expect(prisma.salesRecord.create).not.toHaveBeenCalled();
  });

  // ── Mixed: known and unknown ──────────────────────────────────────────────

  it("handles mixed line items: processes known products, skips unknown", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      null,
    );

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [
          { product_id: 100, variation_id: 0, quantity: 2, price: "29.99" },
          { product_id: 999, variation_id: 0, quantity: 1, price: "9.99" }, // unknown
        ],
      }),
    ]);

    expect(result.upserted).toBe(1);
    expect(result.skippedLineItems).toBe(1);
  });

  // ── Merchant scoping ──────────────────────────────────────────────────────

  it("queries products filtered by merchantId and non-null woocommerceVariantId", async () => {
    const prisma = mockPrisma([], null);
    await syncWooOrders(prisma as never, "merchant-abc", []);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { merchantId: "merchant-abc", woocommerceVariantId: { not: null } },
      select: { id: true, woocommerceVariantId: true },
    });
  });

  // ── Empty orders ──────────────────────────────────────────────────────────

  it("returns zeros for empty orders array", async () => {
    const prisma = mockPrisma();
    const result = await syncWooOrders(prisma as never, "m1", []);

    expect(result).toEqual({ upserted: 0, skippedLineItems: 0 });
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.salesRecord.findUnique).not.toHaveBeenCalled();
  });

  // ── Date normalization ────────────────────────────────────────────────────

  it("normalizes order date to UTC midnight", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      null,
    );

    // Order created at 11pm UTC-5 (next day UTC)
    await syncWooOrders(prisma as never, "m1", [
      order({
        date_created: "2024-03-15T23:30:00-05:00",
        line_items: [{ product_id: 100, variation_id: 0, quantity: 1, price: "10.00" }],
      }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: new Date(Date.UTC(2024, 2, 16)), // UTC date = March 16
        }),
      }),
    );
  });

  // ── Price conversion ──────────────────────────────────────────────────────

  it("converts price from dollars string to cents integer", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", woocommerceVariantId: "100" }],
      null,
    );

    await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [{ product_id: 100, variation_id: 0, quantity: 1, price: "49.99" }],
      }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priceCents: 4999 }),
      }),
    );
  });

  // ── Multiple distinct products ────────────────────────────────────────────

  it("handles multiple distinct (product, date) pairs independently", async () => {
    const prisma = mockPrisma(
      [
        { id: "p1", woocommerceVariantId: "111" },
        { id: "p2", woocommerceVariantId: "222" },
      ],
      null,
    );

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [
          { product_id: 111, variation_id: 0, quantity: 3, price: "10.00" },
          { product_id: 222, variation_id: 0, quantity: 5, price: "20.00" },
        ],
      }),
    ]);

    expect(prisma.salesRecord.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.salesRecord.create).toHaveBeenCalledTimes(2);
    expect(result.upserted).toBe(2);
    expect(result.skippedLineItems).toBe(0);
  });

  // ── Variation vs simple product — both in same order ─────────────────────

  it("correctly routes simple and variation line items in the same order", async () => {
    const prisma = mockPrisma(
      [
        { id: "p-simple", woocommerceVariantId: "10" },   // simple: matched by product_id
        { id: "p-var", woocommerceVariantId: "500" },     // variation: matched by variation_id
      ],
      null,
    );

    const result = await syncWooOrders(prisma as never, "m1", [
      order({
        line_items: [
          { product_id: 10, variation_id: 0, quantity: 1, price: "5.00" },   // simple
          { product_id: 10, variation_id: 500, quantity: 2, price: "15.00" }, // variation
        ],
      }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledTimes(2);
    expect(result.upserted).toBe(2);
    expect(result.skippedLineItems).toBe(0);
  });
});
