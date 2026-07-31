import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyShopifyWebhook,
  decryptToken,
  wasAlreadyProcessed,
  syncProducts,
  syncOrders,
  checkWebhookRateLimit,
} = vi.hoisted(() => ({
  verifyShopifyWebhook: vi.fn(),
  decryptToken: vi.fn(),
  wasAlreadyProcessed: vi.fn(),
  syncProducts: vi.fn(),
  syncOrders: vi.fn(),
  checkWebhookRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopifyConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    processedWebhook: {
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/shopify/webhookAuth", () => ({ verifyShopifyWebhook }));
vi.mock("@/lib/shopify/crypto", () => ({ decryptToken }));
vi.mock("@/lib/webhooks/dedupe", () => ({ wasAlreadyProcessed }));
vi.mock("@/lib/shopify/syncProducts", () => ({ syncProducts }));
vi.mock("@/lib/shopify/syncOrders", () => ({ syncOrders }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkWebhookRateLimit }));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const raw = JSON.stringify(body);
  return {
    text: async () => raw,
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as Request;
}

const CONNECTION = {
  merchantId: "m1",
  shopDomain: "mystore.myshopify.com",
  encryptedApiSecret: "enc:secret",
};

beforeEach(() => {
  vi.clearAllMocks();
  checkWebhookRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  verifyShopifyWebhook.mockReturnValue(true);
  decryptToken.mockReturnValue("plain-secret");
  wasAlreadyProcessed.mockResolvedValue(false);
  (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTION);
  syncProducts.mockResolvedValue({ created: 0, updated: 1, skipped: 0, skippedReasons: [] });
  syncOrders.mockResolvedValue({ upserted: 1, skippedLineItems: 0 });
  (prisma.processedWebhook.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/webhooks/shopify", () => {
  it("returns 401 when the HMAC signature is invalid", async () => {
    verifyShopifyWebhook.mockReturnValue(false);
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "bad-sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(401);
    expect(syncProducts).not.toHaveBeenCalled();
  });

  it("returns 404 when the shop domain has no matching connection", async () => {
    (prisma.shopifyConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "unknown.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 without reprocessing on a replayed delivery id, using a platform+shop-scoped dedup key", async () => {
    wasAlreadyProcessed.mockResolvedValue(true);
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncProducts).not.toHaveBeenCalled();
    expect(wasAlreadyProcessed).toHaveBeenCalledWith(prisma, "shopify:mystore.myshopify.com:d1");
  });

  it("calls syncProducts with a single-item array for products/update", async () => {
    const payload = {
      id: 555,
      title: "Widget",
      image: { src: "https://cdn.example.com/w.jpg" },
      variants: [{ id: 999, product_id: 555, title: "Default Title", sku: "SKU1", price: "19.99", inventory_quantity: 5 }],
    };
    const res = await POST(
      req(payload, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncProducts).toHaveBeenCalledWith(
      prisma,
      "m1",
      [expect.objectContaining({ id: 999, sku: "SKU1", price: "19.99", product_title: "Widget", imageUrl: "https://cdn.example.com/w.jpg" })],
    );
  });

  it("calls syncOrders with a single-item array for orders/create", async () => {
    const payload = {
      id: 777,
      created_at: "2026-07-31T00:00:00Z",
      line_items: [{ variant_id: 999, quantity: 2, price: "19.99" }],
    };
    const res = await POST(
      req(payload, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "orders/create", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncOrders).toHaveBeenCalledWith(prisma, "m1", [payload]);
  });

  it("deletes the connection on app/uninstalled", async () => {
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "app/uninstalled", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(prisma.shopifyConnection.delete).toHaveBeenCalledWith({ where: { merchantId: "m1" } });
  });

  it("returns 200 and does nothing for an unrecognized topic", async () => {
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "customers/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(200);
    expect(syncProducts).not.toHaveBeenCalled();
    expect(syncOrders).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    checkWebhookRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(
      req({ id: 1 }, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" }),
    );
    expect(res.status).toBe(429);
    expect(syncProducts).not.toHaveBeenCalled();
  });

  it("rolls back the dedup record and rethrows when processing fails", async () => {
    syncProducts.mockRejectedValueOnce(new Error("db hiccup"));
    const payload = {
      id: 555,
      title: "Widget",
      image: { src: "https://cdn.example.com/w.jpg" },
      variants: [{ id: 999, product_id: 555, title: "Default Title", sku: "SKU1", price: "19.99", inventory_quantity: 5 }],
    };
    await expect(
      POST(req(payload, { "X-Shopify-Hmac-Sha256": "sig", "X-Shopify-Shop-Domain": "mystore.myshopify.com", "X-Shopify-Topic": "products/update", "X-Shopify-Webhook-Id": "d1" })),
    ).rejects.toThrow("db hiccup");
    expect(prisma.processedWebhook.delete).toHaveBeenCalledWith({ where: { deliveryId: "shopify:mystore.myshopify.com:d1" } });
  });
});
