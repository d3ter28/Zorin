import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyWooWebhook,
  decrypt,
  wasAlreadyProcessed,
  syncWooProducts,
  syncWooOrders,
  checkWebhookRateLimit,
} = vi.hoisted(() => ({
  verifyWooWebhook: vi.fn(),
  decrypt: vi.fn(),
  wasAlreadyProcessed: vi.fn(),
  syncWooProducts: vi.fn(),
  syncWooOrders: vi.fn(),
  checkWebhookRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    wooCommerceConnection: {
      findUnique: vi.fn(),
    },
    processedWebhook: {
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/woocommerce/webhookAuth", () => ({ verifyWooWebhook }));
vi.mock("@/lib/woocommerce/crypto", () => ({ decrypt }));
vi.mock("@/lib/webhooks/dedupe", () => ({ wasAlreadyProcessed }));
vi.mock("@/lib/woocommerce/syncProducts", () => ({ syncWooProducts }));
vi.mock("@/lib/woocommerce/syncOrders", () => ({ syncWooOrders }));
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

function ctx(connectionId: string) {
  return { params: Promise.resolve({ connectionId }) };
}

const CONNECTION = {
  id: "conn123",
  merchantId: "m1",
  encryptedWebhookSecret: "enc:secret",
};

beforeEach(() => {
  vi.clearAllMocks();
  checkWebhookRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  verifyWooWebhook.mockReturnValue(true);
  decrypt.mockReturnValue("plain-secret");
  wasAlreadyProcessed.mockResolvedValue(false);
  (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTION);
  syncWooProducts.mockResolvedValue({ created: 0, updated: 1, skipped: 0, skippedReasons: [] });
  syncWooOrders.mockResolvedValue({ upserted: 1, skippedLineItems: 0 });
  (prisma.processedWebhook.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("POST /api/webhooks/woocommerce/[connectionId]", () => {
  it("returns 401 when the signature is invalid", async () => {
    verifyWooWebhook.mockReturnValue(false);
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "bad", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(401);
    expect(syncWooProducts).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown connectionId", async () => {
    (prisma.wooCommerceConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("unknown"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 without reprocessing on a replayed delivery id, using a platform+connection-scoped dedup key", async () => {
    wasAlreadyProcessed.mockResolvedValue(true);
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooProducts).not.toHaveBeenCalled();
    expect(wasAlreadyProcessed).toHaveBeenCalledWith(prisma, "woocommerce:conn123:d1");
  });

  it("calls syncWooProducts with a single-item array for product.updated", async () => {
    const payload = { id: 42, type: "simple", name: "Widget", sku: "SKU1", regular_price: "9.99", images: [{ src: "https://cdn.example.com/w.jpg" }] };
    const res = await POST(
      req(payload, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooProducts).toHaveBeenCalledWith(
      prisma,
      "m1",
      [{ id: 42, parentId: null, name: "Widget", sku: "SKU1", regularPriceDollars: "9.99", imageUrl: "https://cdn.example.com/w.jpg" }],
    );
  });

  it("calls syncWooOrders with a single-item array for order.created", async () => {
    const payload = { id: 88, date_created: "2026-07-31T00:00:00", line_items: [{ product_id: 42, variation_id: 0, quantity: 3, price: "9.99" }] };
    const res = await POST(
      req(payload, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "order.created", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooOrders).toHaveBeenCalledWith(prisma, "m1", [payload]);
  });

  it("returns 200 and does nothing for an unrecognized topic", async () => {
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "customer.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(200);
    expect(syncWooProducts).not.toHaveBeenCalled();
    expect(syncWooOrders).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    checkWebhookRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(
      req({ id: 1 }, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
      ctx("conn123"),
    );
    expect(res.status).toBe(429);
    expect(syncWooProducts).not.toHaveBeenCalled();
  });

  it("rolls back the dedup record and rethrows when processing fails", async () => {
    syncWooProducts.mockRejectedValueOnce(new Error("db hiccup"));
    const payload = { id: 42, type: "simple", name: "Widget", sku: "SKU1", regular_price: "9.99", images: [{ src: "https://cdn.example.com/w.jpg" }] };
    await expect(
      POST(
        req(payload, { "X-WC-Webhook-Signature": "sig", "X-WC-Webhook-Topic": "product.updated", "X-WC-Webhook-Delivery-Id": "d1" }),
        ctx("conn123"),
      ),
    ).rejects.toThrow("db hiccup");
    expect(prisma.processedWebhook.delete).toHaveBeenCalledWith({ where: { deliveryId: "woocommerce:conn123:d1" } });
  });
});
