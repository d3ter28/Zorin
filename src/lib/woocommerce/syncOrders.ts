import type { PrismaClient } from "@prisma/client";
import type { WooOrder } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncWooOrdersResult {
  upserted: number;
  skippedLineItems: number;
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<PrismaClient, "product" | "salesRecord">;

/**
 * Convert WooCommerce orders into SalesRecords, aggregating line items by
 * (woocommerceVariantId, date) and ADDING to existing unitsSold (not replacing).
 *
 * WooCommerce matching rules:
 *   - variation_id === 0 → simple product → match by String(line_item.product_id)
 *   - variation_id  >  0 → variation      → match by String(line_item.variation_id)
 *
 * Both cases map to woocommerceVariantId on the Product table.
 *
 * Re-syncing the same period is safe: this function increments rather than
 * replaces, unlike importSalesHistory which overwrites.
 */
export async function syncWooOrders(
  prisma: PrismaSurface,
  merchantId: string,
  orders: WooOrder[],
): Promise<SyncWooOrdersResult> {
  // Build woocommerceVariantId → productId map for this merchant
  const products = await prisma.product.findMany({
    where: { merchantId, woocommerceVariantId: { not: null } },
    select: { id: true, woocommerceVariantId: true },
  });
  const variantToProduct = new Map(
    products.map((p) => [p.woocommerceVariantId as string, p.id]),
  );

  // Pre-aggregate all line items by (matchedId, dateISO)
  // key: `${matchedId}:${dateISO}`
  const aggregated = new Map<
    string,
    { units: number; priceCents: number; productId: string; date: Date }
  >();
  let skippedLineItems = 0;

  for (const ord of orders) {
    const d = new Date(ord.date_created);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dateISO = date.toISOString();

    for (const item of ord.line_items ?? []) {
      // variation_id > 0 means it's a variation; 0 means simple product
      const lookupId =
        item.variation_id > 0
          ? String(item.variation_id)
          : String(item.product_id);

      const productId = variantToProduct.get(lookupId);
      if (!productId) {
        skippedLineItems++;
        continue;
      }

      const key = `${lookupId}:${dateISO}`;
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
