import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncOrders } from "./syncOrders";
import type { ShopifyOrder } from "./client";

// Helper to build a mock Prisma surface
function mockPrisma(
  products: { id: string; shopifyVariantId: string | null }[] = [],
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

function order(over: Partial<ShopifyOrder> = {}): ShopifyOrder {
  return {
    id: 1001,
    created_at: "2024-03-15T10:30:00Z",
    line_items: [
      { variant_id: 555, quantity: 2, price: "29.99" },
    ],
    ...over,
  };
}

describe("syncOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Basic upsert (create path) ────────────────────────────────────────────

  it("creates a SalesRecord when none exists for (productId, date)", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      null,
    );

    const result = await syncOrders(prisma as never, "m1", [order()]);

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

  // ── Additive upsert (update path) ─────────────────────────────────────────

  it("increments unitsSold when SalesRecord already exists", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      { id: "sr1", unitsSold: 10 },
    );

    await syncOrders(prisma as never, "m1", [order()]);

    expect(prisma.salesRecord.update).toHaveBeenCalledWith({
      where: { id: "sr1" },
      data: { unitsSold: 12 }, // 10 existing + 2 from order
    });
    expect(prisma.salesRecord.create).not.toHaveBeenCalled();
  });

  // ── Unknown variant IDs ───────────────────────────────────────────────────

  it("skips line items with unknown variant_id and counts them", async () => {
    const prisma = mockPrisma([], null);

    const result = await syncOrders(prisma as never, "m1", [
      order({ line_items: [{ variant_id: 999, quantity: 5, price: "9.99" }] }),
    ]);

    expect(prisma.salesRecord.findUnique).not.toHaveBeenCalled();
    expect(prisma.salesRecord.create).not.toHaveBeenCalled();
    expect(result.upserted).toBe(0);
    expect(result.skippedLineItems).toBe(1);
  });

  // ── Date normalization ────────────────────────────────────────────────────

  it("normalizes order date to UTC midnight", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      null,
    );

    // Order created at 11pm UTC-5 (next day UTC)
    await syncOrders(prisma as never, "m1", [
      order({ created_at: "2024-03-15T23:30:00-05:00" }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: new Date(Date.UTC(2024, 2, 16)), // UTC date = March 16
        }),
      }),
    );
  });

  // ── Pre-aggregation: multiple orders same day same variant ────────────────

  it("aggregates multiple orders for the same (variant, date) before upserting", async () => {
    // Two orders on same day, same variant — should result in ONE findUnique call
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      null,
    );

    await syncOrders(prisma as never, "m1", [
      order({ id: 1001, line_items: [{ variant_id: 555, quantity: 3, price: "29.99" }] }),
      order({ id: 1002, line_items: [{ variant_id: 555, quantity: 7, price: "29.99" }] }),
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

  it("aggregates multiple line items in the same order for the same variant", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      null,
    );

    await syncOrders(prisma as never, "m1", [
      order({
        line_items: [
          { variant_id: 555, quantity: 4, price: "29.99" },
          { variant_id: 555, quantity: 6, price: "29.99" },
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

  // ── Mixed: known and unknown variants ────────────────────────────────────

  it("handles mixed line items: processes known variants, skips unknown", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      null,
    );

    const result = await syncOrders(prisma as never, "m1", [
      order({
        line_items: [
          { variant_id: 555, quantity: 2, price: "29.99" },
          { variant_id: 999, quantity: 1, price: "9.99" }, // unknown
        ],
      }),
    ]);

    expect(result.upserted).toBe(1);
    expect(result.skippedLineItems).toBe(1);
  });

  // ── Multiple products on same day ─────────────────────────────────────────

  it("handles multiple distinct (variant, date) pairs independently", async () => {
    const prisma = mockPrisma(
      [
        { id: "p1", shopifyVariantId: "111" },
        { id: "p2", shopifyVariantId: "222" },
      ],
      null,
    );

    const result = await syncOrders(prisma as never, "m1", [
      order({
        line_items: [
          { variant_id: 111, quantity: 3, price: "10.00" },
          { variant_id: 222, quantity: 5, price: "20.00" },
        ],
      }),
    ]);

    expect(prisma.salesRecord.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.salesRecord.create).toHaveBeenCalledTimes(2);
    expect(result.upserted).toBe(2);
    expect(result.skippedLineItems).toBe(0);
  });

  // ── Price: last price wins for aggregated group ───────────────────────────

  it("sets priceCents from the line item price (dollars to cents)", async () => {
    const prisma = mockPrisma(
      [{ id: "p1", shopifyVariantId: "555" }],
      null,
    );

    await syncOrders(prisma as never, "m1", [
      order({ line_items: [{ variant_id: 555, quantity: 1, price: "49.99" }] }),
    ]);

    expect(prisma.salesRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priceCents: 4999 }),
      }),
    );
  });

  // ── Empty orders ──────────────────────────────────────────────────────────

  it("returns zeros for empty orders array", async () => {
    const prisma = mockPrisma();
    const result = await syncOrders(prisma as never, "m1", []);

    expect(result).toEqual({ upserted: 0, skippedLineItems: 0 });
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.salesRecord.findUnique).not.toHaveBeenCalled();
  });

  // ── Merchant scoping for product lookup ───────────────────────────────────

  it("queries products filtered by merchantId and non-null shopifyVariantId", async () => {
    const prisma = mockPrisma([], null);
    await syncOrders(prisma as never, "merchant-abc", []);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { merchantId: "merchant-abc", shopifyVariantId: { not: null } },
      select: { id: true, shopifyVariantId: true },
    });
  });
});
