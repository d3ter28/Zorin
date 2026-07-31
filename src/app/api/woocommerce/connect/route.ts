import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { encrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";
import { generateWooWebhookSecret } from "@/lib/woocommerce/webhookAuth";
import { getAppUrl } from "@/lib/appConfig";

function normalizeStoreUrl(raw: string): string {
  let url = raw.trim();
  if (url.length === 0) throw new HttpError(400, "storeUrl is required");
  url = url.replace(/\/$/, ""); // strip trailing slash
  if (url.startsWith("http://")) {
    url = "https://" + url.slice("http://".length);
  } else if (!url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
}

const WEBHOOK_TOPICS = ["product.updated", "order.created"];

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await req.json() as { storeUrl?: unknown; consumerKey?: unknown; consumerSecret?: unknown };
  if (!body.storeUrl || typeof body.storeUrl !== "string") {
    throw new HttpError(400, "storeUrl is required");
  }
  if (!body.consumerKey || typeof body.consumerKey !== "string") {
    throw new HttpError(400, "consumerKey is required");
  }
  if (!body.consumerSecret || typeof body.consumerSecret !== "string") {
    throw new HttpError(400, "consumerSecret is required");
  }
  const storeUrl = normalizeStoreUrl(body.storeUrl);
  const consumerKey = body.consumerKey;
  const consumerSecret = body.consumerSecret;
  const client = new WooCommerceClient(storeUrl, consumerKey, consumerSecret);
  let storeName: string;
  try {
    const result = await client.verifyConnection();
    storeName = result.storeName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/4\d\d/.test(msg)) throw new HttpError(400, "Invalid WooCommerce credentials or store URL");
    throw err;
  }
  const encryptedKey = encrypt(consumerKey);
  const encryptedSecret = encrypt(consumerSecret);
  const webhookSecret = generateWooWebhookSecret();
  const encryptedWebhookSecret = encrypt(webhookSecret);

  // Upsert first (without webhookIds) so we have a stable connection id to
  // build the per-merchant webhook delivery URL from.
  const connection = await prisma.wooCommerceConnection.upsert({
    where: { merchantId },
    create: { merchantId, storeUrl, encryptedKey, encryptedSecret, encryptedWebhookSecret },
    update: { storeUrl, encryptedKey, encryptedSecret, encryptedWebhookSecret },
  });

  const deliveryUrl = `${getAppUrl()}/api/webhooks/woocommerce/${connection.id}`;
  const webhookIds: string[] = [];
  for (const topic of WEBHOOK_TOPICS) {
    const id = await client.createWebhook(topic, deliveryUrl, webhookSecret);
    webhookIds.push(id);
  }

  await prisma.wooCommerceConnection.update({
    where: { merchantId },
    data: { webhookIds: JSON.stringify(webhookIds) },
  });

  return NextResponse.json({ storeName });
});
