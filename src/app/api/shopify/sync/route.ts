import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { decryptToken } from "@/lib/shopify/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { syncProducts } from "@/lib/shopify/syncProducts";
import { syncOrders } from "@/lib/shopify/syncOrders";
import type { ShopifyVariant, ShopifyOrder } from "@/lib/shopify/client";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.shopifyConnection.findUnique({
    where: { merchantId },
    select: { shopDomain: true, encryptedToken: true, lastSyncedAt: true },
  });

  if (!connection) {
    throw new HttpError(404, "No Shopify connection found");
  }

  const accessToken = decryptToken(connection.encryptedToken);
  const client = new ShopifyClient(connection.shopDomain, accessToken);

  const sinceDate: Date = connection.lastSyncedAt
    ? connection.lastSyncedAt
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // Collect all variants across pages
  const allVariants: ShopifyVariant[] = [];
  for await (const page of client.fetchAllProducts()) {
    allVariants.push(...page);
  }

  // Collect all orders across pages
  const allOrders: ShopifyOrder[] = [];
  for await (const page of client.fetchOrders(sinceDate)) {
    allOrders.push(...page);
  }

  const [productsResult, ordersResult] = await Promise.all([
    syncProducts(prisma, merchantId, allVariants),
    syncOrders(prisma, merchantId, allOrders),
  ]);

  await prisma.shopifyConnection.update({
    where: { merchantId },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ products: productsResult, orders: ordersResult });
});
