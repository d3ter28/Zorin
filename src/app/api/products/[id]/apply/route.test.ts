import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueOrThrow, update } = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
}));

const { create: createPriceChange } = vi.hoisted(() => ({
  create: vi.fn(),
}));

const { deleteMany: deleteRecs } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}));

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUniqueOrThrow, update },
    priceChange: { create: createPriceChange },
    recommendation: { deleteMany: deleteRecs },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "test@example.com", merchantId: "m1" },
  })),
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProductOwned: vi.fn(async () => {}),
}));

const mockPushPrice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shopify/pushPrice", () => ({
  pushPriceToShopify: mockPushPrice,
}));

const mockGetWooClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/woocommerce/getClient", () => ({
  getWooClient: mockGetWooClient,
}));

const mockPushPriceToWooCommerce = vi.hoisted(() => vi.fn());
vi.mock("@/lib/woocommerce/pushPrice", () => ({
  pushPriceToWooCommerce: mockPushPriceToWooCommerce,
}));

import { POST } from "./route";

function makeReq(body: unknown): Request {
  return {
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

const ctx = { params: Promise.resolve({ id: "p1" }) };

beforeEach(() => {
  findUniqueOrThrow.mockReset();
  mockTransaction.mockReset();
  mockPushPrice.mockReset();
  mockGetWooClient.mockReset();
  mockPushPriceToWooCommerce.mockReset();
  mockTransaction.mockResolvedValue(undefined);
});

describe("POST /api/products/[id]/apply — Shopify integration", () => {
  it("calls pushPriceToShopify when product has shopifyVariantId", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: "12345",
    });
    mockPushPrice.mockResolvedValue(undefined);

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockPushPrice).toHaveBeenCalledWith("m1", "12345", 1500);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns 502 and skips DB when Shopify push fails", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: "12345",
    });
    mockPushPrice.mockRejectedValue(new Error("404: Not Found"));

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toContain("Shopify sync failed:");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("skips Shopify push when product has no shopifyVariantId", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: null,
    });

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockPushPrice).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns 400 when new price is the same as current price", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1500,
      shopifyVariantId: null,
    });

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("same");
    expect(mockPushPrice).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 when price is not a positive number", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: null,
    });

    const res = await POST(makeReq({ price: -50 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(mockPushPrice).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("POST /api/products/[id]/apply — WooCommerce integration", () => {
  it("returns woocommercePushed: true when WC push succeeds", async () => {
    const mockClient = {};
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: null,
      woocommerceVariantId: "wc-99",
    });
    mockGetWooClient.mockResolvedValue(mockClient);
    mockPushPriceToWooCommerce.mockResolvedValue({ ok: true });

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.woocommercePushed).toBe(true);
    expect(body.woocommerceError).toBeUndefined();
    expect(mockGetWooClient).toHaveBeenCalledWith("m1");
    expect(mockPushPriceToWooCommerce).toHaveBeenCalledWith(
      expect.anything(),
      mockClient,
      "p1",
      "15.00",
    );
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns woocommercePushed: false with error when WC push fails", async () => {
    const mockClient = {};
    findUniqueOrThrow.mockResolvedValue({
      id: "p1",
      currentPrice: 1000,
      shopifyVariantId: null,
      woocommerceVariantId: "wc-99",
    });
    mockGetWooClient.mockResolvedValue(mockClient);
    mockPushPriceToWooCommerce.mockResolvedValue({ ok: false, error: "timeout" });

    const res = await POST(makeReq({ price: 1500 }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.woocommercePushed).toBe(false);
    expect(body.woocommerceError).toBe("timeout");
    expect(mockTransaction).toHaveBeenCalled();
  });
});
