import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyShopifyWebhook } from "@/lib/shopify/webhookAuth";
import { decryptToken } from "@/lib/shopify/crypto";
import { wasAlreadyProcessed } from "@/lib/webhooks/dedupe";
import { syncProducts } from "@/lib/shopify/syncProducts";
import { syncOrders } from "@/lib/shopify/syncOrders";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import type { ShopifyVariant, ShopifyOrder } from "@/lib/shopify/client";

interface RawWebhookProduct {
  id: number;
  title: string;
  image?: { src: string };
  variants: Array<{
    id: number;
    product_id: number;
    title: string;
    sku: string;
    price: string;
    inventory_quantity: number;
  }>;
}

function mapProductPayload(raw: RawWebhookProduct): ShopifyVariant[] {
  const imageUrl = raw.image?.src ?? null;
  return raw.variants.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    title: v.title,
    product_title: raw.title,
    sku: v.sku,
    price: v.price,
    inventory_quantity: v.inventory_quantity,
    imageUrl,
  }));
}

export async function POST(req: Request): Promise<NextResponse> {
  const shopDomain = req.headers.get("X-Shopify-Shop-Domain");
  const { allowed } = await checkRateLimit(`shopify-webhook:${shopDomain ?? "unknown"}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = req.headers.get("X-Shopify-Topic") ?? "";
  const rawDeliveryId = req.headers.get("X-Shopify-Webhook-Id") ?? "";

  if (!shopDomain) {
    return NextResponse.json({ error: "Missing X-Shopify-Shop-Domain header" }, { status: 400 });
  }

  const connection = await prisma.shopifyConnection.findUnique({ where: { shopDomain } });
  if (!connection) {
    return NextResponse.json({ error: "Unknown shop domain" }, { status: 404 });
  }

  const apiSecret = decryptToken(connection.encryptedApiSecret);
  if (!verifyShopifyWebhook(rawBody, signature, apiSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Scope the dedup key by platform+shop so a delivery id from a different
  // platform or merchant can never collide with this one (ProcessedWebhook.
  // deliveryId is a single global-unique column with no other scoping).
  const scopedDeliveryId = rawDeliveryId ? `shopify:${shopDomain}:${rawDeliveryId}` : null;
  if (scopedDeliveryId && (await wasAlreadyProcessed(prisma, scopedDeliveryId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const payload = JSON.parse(rawBody);

    switch (topic) {
      case "products/update": {
        const variants = mapProductPayload(payload as RawWebhookProduct);
        await syncProducts(prisma, connection.merchantId, variants);
        break;
      }
      case "orders/create": {
        await syncOrders(prisma, connection.merchantId, [payload as ShopifyOrder]);
        break;
      }
      case "app/uninstalled": {
        await prisma.shopifyConnection.delete({ where: { merchantId: connection.merchantId } });
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
