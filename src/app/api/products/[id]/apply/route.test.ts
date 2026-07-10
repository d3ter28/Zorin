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
