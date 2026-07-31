import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWooWebhook } from "@/lib/woocommerce/webhookAuth";
import { decrypt } from "@/lib/woocommerce/crypto";
import { wasAlreadyProcessed } from "@/lib/webhooks/dedupe";
import { syncWooProducts } from "@/lib/woocommerce/syncProducts";
import { syncWooOrders } from "@/lib/woocommerce/syncOrders";
import { checkWebhookRateLimit } from "@/lib/auth/rateLimit";
import type { WooNormalizedProduct, WooOrder } from "@/lib/woocommerce/client";

interface RawWebhookProduct {
  id: number;
  type: string;
  name: string;
  sku: string;
  regular_price: string;
  images?: Array<{ src: string }>;
}

function mapProductPayload(raw: RawWebhookProduct): WooNormalizedProduct {
  return {
    id: raw.id,
    parentId: null,
    name: raw.name,
    sku: raw.sku,
    regularPriceDollars: raw.regular_price,
    imageUrl: raw.images?.[0]?.src ?? null,
  };
}

interface RouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function POST(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { connectionId } = await ctx.params;

  const { allowed } = await checkWebhookRateLimit(`woocommerce-webhook:${connectionId}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-WC-Webhook-Signature") ?? "";
  const topic = req.headers.get("X-WC-Webhook-Topic") ?? "";
  const rawDeliveryId = req.headers.get("X-WC-Webhook-Delivery-Id") ?? "";

  const connection = await prisma.wooCommerceConnection.findUnique({ where: { id: connectionId } });
  if (!connection) {
    return NextResponse.json({ error: "Unknown connection" }, { status: 404 });
  }

  const webhookSecret = decrypt(connection.encryptedWebhookSecret);
  if (!verifyWooWebhook(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Scope the dedup key by platform+connection so a delivery id from a
  // different platform or merchant can never collide with this one
  // (ProcessedWebhook.deliveryId is a single global-unique column with no
  // other scoping).
  const scopedDeliveryId = rawDeliveryId ? `woocommerce:${connectionId}:${rawDeliveryId}` : null;
  if (scopedDeliveryId && (await wasAlreadyProcessed(prisma, scopedDeliveryId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const payload = JSON.parse(rawBody);

    switch (topic) {
      case "product.updated": {
        const product = mapProductPayload(payload as RawWebhookProduct);
        await syncWooProducts(prisma, connection.merchantId, [product]);
        break;
      }
      case "order.created": {
        await syncWooOrders(prisma, connection.merchantId, [payload as WooOrder]);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Processing failed after the dedup record was already written. Delete it
    // so the platform's retry (triggered by the non-2xx this throws into)
    // can actually reprocess the delivery instead of being silently dropped
    // as a duplicate forever.
    if (scopedDeliveryId) {
      await prisma.processedWebhook.delete({ where: { deliveryId: scopedDeliveryId } }).catch(() => {});
    }
    throw err;
  }

  return NextResponse.json({ received: true });
}
