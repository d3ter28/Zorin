import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { encryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient, SHOPIFY_WEBHOOK_TOPICS } from "@/lib/shopify/client";
import { getAppUrl } from "@/lib/appConfig";
import {
  isValidShopDomain,
  verifyOAuthHmac,
  exchangeCodeForToken,
  getAppClientSecret,
} from "@/lib/shopify/oauth";

function redirectWithError(req: NextRequest, message: string) {
  const url = new URL("/settings/integrations", req.url);
  url.searchParams.set("shopify_error", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete("shopify_oauth_state");
  res.cookies.delete("shopify_oauth_shop");
  return res;
}

export async function GET(req: NextRequest) {
  const { merchantId } = await requireSessionPage();

  const params = req.nextUrl.searchParams;
  const shop = params.get("shop")?.trim().toLowerCase() ?? "";
  const code = params.get("code");
  const state = params.get("state");

  if (!isValidShopDomain(shop)) {
    return redirectWithError(req, "Invalid shop domain returned by Shopify.");
  }
  if (!code || !state) {
    return redirectWithError(req, "Missing code or state — try connecting again.");
  }
  if (!verifyOAuthHmac(params)) {
    return redirectWithError(req, "Could not verify the request came from Shopify.");
  }

  const cookieState = req.cookies.get("shopify_oauth_state")?.value;
  const cookieShop = req.cookies.get("shopify_oauth_shop")?.value;
  if (!cookieState || cookieState !== state || cookieShop !== shop) {
    return redirectWithError(req, "Connection session expired — try connecting again.");
  }

  try {
    const { accessToken } = await exchangeCodeForToken(shop, code);
    const client = new ShopifyClient(shop, accessToken);

    // Not transactional against Shopify — same accepted risk as the manual
    // custom-app connect route: a crash partway through this loop, or a
    // reconnect that overwrites webhookIds without deleting the old ones
    // first, can orphan webhooks on Shopify's side with no local record.
    const webhookAddress = `${getAppUrl()}/api/webhooks/shopify`;
    const webhookIds: string[] = [];
    for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
      const id = await client.createWebhook(topic, webhookAddress);
      webhookIds.push(id);
    }

    // OAuth apps verify webhook HMACs with one app-wide client secret, not a
    // per-merchant secret — encrypt and store it per-connection anyway so
    // the existing webhook-verification code path (which reads a
    // per-connection encryptedApiSecret) needs no changes for either
    // connection method.
    const encryptedToken = encryptToken(accessToken);
    const encryptedApiSecret = encryptToken(getAppClientSecret());

    await prisma.shopifyConnection.upsert({
      where: { merchantId },
      create: {
        merchantId,
        shopDomain: shop,
        encryptedToken,
        encryptedApiSecret,
        webhookIds: JSON.stringify(webhookIds),
      },
      update: {
        shopDomain: shop,
        encryptedToken,
        encryptedApiSecret,
        webhookIds: JSON.stringify(webhookIds),
      },
    });
  } catch {
    return redirectWithError(req, "Shopify connection failed — try again.");
  }

  const url = new URL("/settings/integrations", req.url);
  url.searchParams.set("shopify_connected", "1");
  const res = NextResponse.redirect(url);
  res.cookies.delete("shopify_oauth_state");
  res.cookies.delete("shopify_oauth_shop");
  return res;
}
