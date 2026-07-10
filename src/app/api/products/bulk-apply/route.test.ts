import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findMany, update: vi.fn() },
    priceChange: { create: vi.fn() },
    recommendation: { deleteMany: vi.fn() },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "test@example.com", merchantId: "m1" },
  })),
}));

const mockPushPrice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/pushPrice", () => ({
  pushPriceToShopify: mockPushPrice,
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return {
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

beforeEach(() => {
  findMany.mockReset();
  mockTransaction.mockReset();
  mockPushPrice.mockReset();
  mockTransaction.mockResolvedValue(undefined);
});

const productWithShopify = {
  id: "p1",
  title: "Widget",
  merchantId: "m1",
  currentPrice: 1000,
  shopifyVariantId: "12345",
  recommendation: {
    action: "raise",
    rulesJson: JSON.stringify({ suggestedPriceCents: 1500 }),
  },
};

const productWithoutShopify = {
  id: "p2",
  title: "Gadget",
  merchantId: "m1",
  currentPrice: 2000,
  shopifyVariantId: null,
  recommendation: {
    action: "lower",
    rulesJson: JSON.stringify({ suggestedPriceCents: 1800 }),
  },
};

const productNoRec = {
  id: "p3",
  title: "Doohickey",
  merchantId: "m1",
  currentPrice: 500,
  shopifyVariantId: "67890",
  recommendation: null,
};

describe("POST /api/products/bulk-apply — Shopify integration", () => {
  it("pushes to Shopify for products with variantId and applies locally", async () => {
    findMany.mockResolvedValue([productWithShopify]);
    mockPushPrice.mockResolvedValue(undefined);

    const res = await POST(makeReq({ productIds: ["p1"] }));
    const body = await res.json();

    expect(mockPushPrice).toHaveBeenCalledWith("m1", "12345", 1500);
    expect(mockTransaction).toHaveBeenCalled();
    expect(body.applied).toBe(1);
    expect(body.failed).toHaveLength(0);
  });

  it("applies locally without Shopify call when no variantId", async () => {
    findMany.mockResolvedValue([productWithoutShopify]);

    const res = await POST(makeReq({ productIds: ["p2"] }));
    const body = await res.json();

    expect(mockPushPrice).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalled();
    expect(body.applied).toBe(1);
    expect(body.failed).toHaveLength(0);
  });

  it("records failure when Shopify push fails, skips local transaction", async () => {
    findMany.mockResolvedValue([productWithShopify]);
    mockPushPrice.mockRejectedValue(new Error("404: Not Found"));

    const res = await POST(makeReq({ productIds: ["p1"] }));
    const body = await res.json();

    expect(body.applied).toBe(0);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0]).toEqual({
      id: "p1",
      title: "Widget",
      reason: "Shopify sync failed: 404: Not Found",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("handles partial success — one Shopify success, one failure", async () => {
    findMany.mockResolvedValue([productWithShopify, {
      ...productWithShopify,
      id: "p4",
      title: "Sprocket",
      shopifyVariantId: "99999",
    }]);
    mockPushPrice
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("429: Too Many Requests"));

    const res = await POST(makeReq({ productIds: ["p1", "p4"] }));
    const body = await res.json();

    expect(body.applied).toBe(1);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0].id).toBe("p4");
  });

  it("skips products without recommendations", async () => {
    findMany.mockResolvedValue([productNoRec]);

    const res = await POST(makeReq({ productIds: ["p3"] }));
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(body.applied).toBe(0);
    expect(body.failed).toHaveLength(0);
    expect(mockPushPrice).not.toHaveBeenCalled();
  });
});
