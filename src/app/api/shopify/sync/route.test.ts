import { beforeEach, describe, expect, it, vi } from "vitest";

// ── hoisted mocks ────────────────────────────────────────────────────────────

const { decryptToken, mockFetchAllProducts, mockFetchOrders, syncProducts, syncOrders } =
  vi.hoisted(() => ({
    decryptToken: vi.fn(),
    mockFetchAllProducts: vi.fn(),
    mockFetchOrders: vi.fn(),
    syncProducts: vi.fn(),
    syncOrders: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shopify/crypto", () => ({ decryptToken }));

vi.mock("@/lib/shopify/client", () => ({
  ShopifyClient: class MockShopifyClient {
    constructor(
      public shopDomain: string,
      public accessToken: string,
    ) {}
    fetchAllProducts = mockFetchAllProducts;
    fetchOrders = mockFetchOrders;
  },
}));

vi.mock("@/lib/shopify/syncProducts", () => ({ syncProducts }));
vi.mock("@/lib/shopify/syncOrders", () => ({ syncOrders }));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

// Async generator helpers
async function* makeVariantPages() {
  yield [
    {
      id: 1,
      product_id: 10,
      title: "Default Title",
      product_title: "Shirt",
      sku: "TEE-1",
      price: "29.99",
      inventory_quantity: 5,
    },
  ];
}
async function* makeOrderPages() {
  yield [{ id: 99, created_at: "2026-01-01T00:00:00Z", line_items: [] }];
}

beforeEach(() => {
  vi.clearAllMocks();
  decryptToken.mockReturnValue("raw-token");
  mockFetchAllProducts.mockReturnValue(makeVariantPages());
  mockFetchOrders.mockReturnValue(makeOrderPages());
  syncProducts.mockResolvedValue({ created: 1, updated: 0, skipped: 0, skippedReasons: [] });
  syncOrders.mockResolvedValue({ upserted: 0, skippedLineItems: 0 });
  (prisma.shopifyConnection.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/shopify/sync", () => {
  it("returns 404 when no connection exists", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(404);
  });

  it("uses lastSyncedAt as sinceDate when available", async () => {
    const lastSyncedAt = new Date("2026-05-01T00:00:00.000Z");
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      lastSyncedAt,
    });

    const res = await POST(req());
    expect(res.status).toBe(200);

    const sinceDate: Date = mockFetchOrders.mock.calls[0][0];
    expect(sinceDate.toISOString()).toBe(lastSyncedAt.toISOString());
  });

  it("uses 12 months ago when lastSyncedAt is null", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      lastSyncedAt: null,
    });

    const before = Date.now();
    const res = await POST(req());
    const after = Date.now();
    expect(res.status).toBe(200);

    const sinceDate: Date = mockFetchOrders.mock.calls[0][0];
    const expectedMs = 365 * 24 * 60 * 60 * 1000;
    expect(sinceDate.getTime()).toBeGreaterThanOrEqual(before - expectedMs - 100);
    expect(sinceDate.getTime()).toBeLessThanOrEqual(after - expectedMs + 100);
  });

  it("calls syncProducts and syncOrders and returns combined results", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      lastSyncedAt: null,
    });

    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toEqual({ created: 1, updated: 0, skipped: 0, skippedReasons: [] });
    expect(body.orders).toEqual({ upserted: 0, skippedLineItems: 0 });
    expect(syncProducts).toHaveBeenCalledOnce();
    expect(syncOrders).toHaveBeenCalledOnce();
  });

  it("updates lastSyncedAt after a successful sync", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      shopDomain: "mystore.myshopify.com",
      encryptedToken: "enc",
      lastSyncedAt: null,
    });

    await POST(req());
    expect(prisma.shopifyConnection.update).toHaveBeenCalledOnce();
    const updateCall = (prisma.shopifyConnection.update as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(updateCall.where.merchantId).toBe("m1");
    expect(updateCall.data.lastSyncedAt).toBeInstanceOf(Date);
  });
});
