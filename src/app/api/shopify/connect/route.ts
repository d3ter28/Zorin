import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { encryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { getAppUrl } from "@/lib/appConfig";

function normalizeDomain(raw: string): string {
  let domain = raw.trim().toLowerCase();
  if (domain.length === 0) throw new HttpError(400, "shopDomain is required");
  domain = domain.replace(/^https?:\/\//, ""); // strip scheme
  domain = domain.split("/")[0]; // strip path
  if (!domain.endsWith(".myshopify.com")) {
    domain = domain.replace(/\.myshopify\.com$/, "") + ".myshopify.com";
  }
  return domain;
}

const WEBHOOK_TOPICS = ["products/update", "orders/create", "app/uninstalled"];

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const body = await req.json() as { shopDomain?: unknown; accessToken?: unknown; apiSecret?: unknown };

  if (!body.shopDomain || typeof body.shopDomain !== "string") {
    throw new HttpError(400, "shopDomain is required");
  }
  if (!body.accessToken || typeof body.accessToken !== "string") {
    throw new HttpError(400, "accessToken is required");
  }
  if (!body.apiSecret || typeof body.apiSecret !== "string") {
    throw new HttpError(400, "apiSecret is required");
  }

  const shopDomain = normalizeDomain(body.shopDomain);
  const accessToken = body.accessToken;
  const apiSecret = body.apiSecret;

  const client = new ShopifyClient(shopDomain, accessToken);

  let shopName: string;
  try {
    const result = await client.verifyConnection();
    shopName = result.shopName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/4\d\d/.test(msg)) throw new HttpError(401, "Invalid Shopify credentials or domain");
    throw err; // let withErrorHandling produce the 500
  }

  // Not transactional: if createWebhook throws partway through this loop,
  // the webhooks already created on Shopify have no local record and can't
  // be cleaned up via /disconnect. Same on reconnect — the upsert below
  // overwrites webhookIds without deleting the old ones first, so prior
  // webhooks are orphaned on Shopify's side. Accepted risk for now (low
  // blast radius pre-launch); revisit if this shows up as leaked webhooks.
  const webhookAddress = `${getAppUrl()}/api/webhooks/shopify`;
  const webhookIds: string[] = [];
  for (const topic of WEBHOOK_TOPICS) {
    const id = await client.createWebhook(topic, webhookAddress);
    webhookIds.push(id);
  }

  const encryptedToken = encryptToken(accessToken);
  const encryptedApiSecret = encryptToken(apiSecret);

  await prisma.shopifyConnection.upsert({
    where: { merchantId },
    create: {
      merchantId,
      shopDomain,
      encryptedToken,
      encryptedApiSecret,
      webhookIds: JSON.stringify(webhookIds),
    },
    update: {
      shopDomain,
      encryptedToken,
      encryptedApiSecret,
      webhookIds: JSON.stringify(webhookIds),
    },
  });

  return NextResponse.json({ success: true, shopName });
});
