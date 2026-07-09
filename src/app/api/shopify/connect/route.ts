import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { encryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";

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

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const body = await req.json() as { shopDomain?: unknown; accessToken?: unknown };

  if (!body.shopDomain || typeof body.shopDomain !== "string") {
    throw new HttpError(400, "shopDomain is required");
  }
  if (!body.accessToken || typeof body.accessToken !== "string") {
    throw new HttpError(400, "accessToken is required");
  }

  const shopDomain = normalizeDomain(body.shopDomain);
  const accessToken = body.accessToken;

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

  const encryptedToken = encryptToken(accessToken);

  await prisma.shopifyConnection.upsert({
    where: { merchantId },
    create: { merchantId, shopDomain, encryptedToken },
    update: { shopDomain, encryptedToken },
  });

  return NextResponse.json({ success: true, shopName });
});
