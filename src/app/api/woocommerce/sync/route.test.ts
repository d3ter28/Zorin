import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockDecrypt = vi.hoisted(() => vi.fn((s: string) => s.replace("enc:", "")));
const mockSyncProducts = vi.hoisted(() => vi.fn());
const mockSyncOrders = vi.hoisted(() => vi.fn());

const mockFetchAllProducts = vi.hoisted(() => vi.fn());
const mockFetchOrders = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/requireSession", () => ({ requireSessionApi: mockRequireSession }));
vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: { findUnique: mockFindUnique, update: mockUpdate },
  },
}));
vi.mock("@/lib/woocommerce/crypto", () => ({ decrypt: mockDecrypt }));
vi.mock("@/lib/woocommerce/syncProducts", () => ({ syncWooProducts: mockSyncProducts }));
vi.mock("@/lib/woocommerce/syncOrders", () => ({ syncWooOrders: mockSyncOrders }));
vi.mock("@/lib/woocommerce/client", () => ({
  WooCommerceClient: vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    _storeUrl: string,
    _consumerKey: string,
    _consumerSecret: string,
  ) {
    this.fetchAllProducts = mockFetchAllProducts;
    this.fetchOrders = mockFetchOrders;
  }),
}));

async function* emptyGen() {}
async function* productGen() {
  yield [{ id: 1, parentId: null, name: "Widget", sku: "W1", regularPriceDollars: "10.00" }];
}
async function* orderGen() {
  yield [{ id: 1, date_created: "2025-06-15T00:00:00", line_items: [] }];
}

describe("POST /api/woocommerce/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ merchantId: "m1" });
    mockSyncProducts.mockResolvedValue({ created: 1, updated: 0, skipped: 0 });
    mockSyncOrders.mockResolvedValue({ upserted: 1, skippedLineItems: 0 });
    mockFetchAllProducts.mockImplementation(() => productGen());
    mockFetchOrders.mockImplementation(() => orderGen());
  });

  it("returns 400 when not connected", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("returns sync counts on success", async () => {
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_x",
      encryptedSecret: "enc:cs_x",
      lastSyncedAt: null,
    });
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.productsCreated).toBe(1);
    expect(body.ordersImported).toBe(1);
  });

  it("updates lastSyncedAt after sync", async () => {
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_x",
      encryptedSecret: "enc:cs_x",
      lastSyncedAt: null,
    });
    const { POST } = await import("./route");
    await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { merchantId: "m1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("uses lastSyncedAt as sinceDate when available", async () => {
    const lastSyncedAt = new Date("2026-05-01T00:00:00.000Z");
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_x",
      encryptedSecret: "enc:cs_x",
      lastSyncedAt,
    });
    const { POST } = await import("./route");
    await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    const sinceDate: Date = mockFetchOrders.mock.calls[0][0];
    expect(sinceDate.toISOString()).toBe(lastSyncedAt.toISOString());
  });

  it("uses ~24 months ago as sinceDate when lastSyncedAt is null", async () => {
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_x",
      encryptedSecret: "enc:cs_x",
      lastSyncedAt: null,
    });
    const before = Date.now();
    const { POST } = await import("./route");
    await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    const after = Date.now();
    const sinceDate: Date = mockFetchOrders.mock.calls[0][0];
    const expectedMs = 1000 * 60 * 60 * 24 * 30 * 24;
    expect(sinceDate.getTime()).toBeGreaterThanOrEqual(before - expectedMs - 200);
    expect(sinceDate.getTime()).toBeLessThanOrEqual(after - expectedMs + 200);
  });

  it("decrypts credentials from connection", async () => {
    mockFindUnique.mockResolvedValue({
      storeUrl: "https://mystore.com",
      encryptedKey: "enc:ck_real",
      encryptedSecret: "enc:cs_real",
      lastSyncedAt: null,
    });
    const { WooCommerceClient } = await import("@/lib/woocommerce/client");
    const { POST } = await import("./route");
    await POST(new Request("http://localhost/api/woocommerce/sync", { method: "POST" }));
    expect(WooCommerceClient).toHaveBeenCalledWith(
      "https://mystore.com",
      "ck_real",
      "cs_real",
    );
  });
});
