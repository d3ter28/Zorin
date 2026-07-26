import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { decrypt } from "@/lib/woocommerce/crypto";
import { WooCommerceClient } from "@/lib/woocommerce/client";
import { syncWooProducts } from "@/lib/woocommerce/syncProducts";
import { syncWooOrders } from "@/lib/woocommerce/syncOrders";
import type { WooNormalizedProduct, WooOrder } from "@/lib/woocommerce/client";

export const POST = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.wooCommerceConnection.findUnique({ where: { merchantId } });
  if (!connection) throw new HttpError(400, "WooCommerce not connected");

  const consumerKey = decrypt(connection.encryptedKey);
  const consumerSecret = decrypt(connection.encryptedSecret);
  const client = new WooCommerceClient(connection.storeUrl, consumerKey, consumerSecret);

  const sinceDate = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt)
    : new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000); // 730 days ≈ 24 months

  // Collect all product pages
  const allProducts: WooNormalizedProduct[] = [];
  for await (const page of client.fetchAllProducts()) {
    allProducts.push(...page);
  }

  // Collect all order pages
  const allOrders: WooOrder[] = [];
  for await (const page of client.fetchOrders(sinceDate)) {
    allOrders.push(...page);
  }

  const [productResult, orderResult] = await Promise.all([
    syncWooProducts(prisma, merchantId, allProducts),
    syncWooOrders(prisma, merchantId, allOrders),
  ]);

  await prisma.wooCommerceConnection.update({
    where: { merchantId },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({
    productsCreated: productResult.created,
    productsUpdated: productResult.updated,
    productsSkipped: productResult.skipped,
    ordersImported: orderResult.upserted,
  });
});
