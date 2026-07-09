import type { PrismaClient } from "@prisma/client";
import type { ShopifyOrder } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncOrdersResult {
  upserted: number;
  skippedLineItems: number;
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<PrismaClient, "product" | "salesRecord">;

/**
 * Convert Shopify orders into SalesRecords, aggregating line items by
 * (variant_id, date) and ADDING to existing unitsSold (not replacing).
 *
 * Re-syncing the same period is safe: this function increments rather than
 * replaces, unlike importSalesHistory which overwrites.
 */
export async function syncOrders(
  prisma: PrismaSurface,
  merchantId: string,
  orders: ShopifyOrder[],
): Promise<SyncOrdersResult> {
  // Build variant_id → productId map for this merchant
  const products = await prisma.product.findMany({
    where: { merchantId, shopifyVariantId: { not: null } },
    select: { id: true, shopifyVariantId: true },
  });
  const variantToProduct = new Map(
    products.map((p) => [p.shopifyVariantId as string, p.id]),
  );

  // Pre-aggregate all line items by (variantId, dateISO)
  // key: `${variant_id}:${dateISO}`
  const aggregated = new Map<
    string,
    { units: number; priceCents: number; productId: string; date: Date }
  >();
  let skippedLineItems = 0;

  for (const ord of orders) {
    const d = new Date(ord.created_at);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dateISO = date.toISOString();

    for (const item of ord.line_items) {
      const variantIdStr = String(item.variant_id);
      const productId = variantToProduct.get(variantIdStr);

      if (!productId) {
        skippedLineItems++;
        continue;
      }

      const key = `${variantIdStr}:${dateISO}`;
      const priceCents = dollarsToCents(item.price) ?? 0;

      const existing = aggregated.get(key);
      if (existing) {
        existing.units += item.quantity;
        existing.priceCents = priceCents; // last price wins
      } else {
        aggregated.set(key, { units: item.quantity, priceCents, productId, date });
      }
    }
  }

  // Additive upsert: read-then-update so re-syncs don't double-count
  let upserted = 0;

  for (const { units, priceCents, productId, date } of aggregated.values()) {
    const existing = await prisma.salesRecord.findUnique({
      where: { productId_date: { productId, date } },
    });

    if (existing) {
      await prisma.salesRecord.update({
        where: { id: existing.id },
        data: { unitsSold: existing.unitsSold + units },
      });
    } else {
      await prisma.salesRecord.create({
        data: { productId, merchantId, date, unitsSold: units, priceCents },
      });
    }

    upserted++;
  }

  return { upserted, skippedLineItems };
}
