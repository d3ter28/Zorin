import type { PrismaClient } from "@prisma/client";
import type { ShopifyVariant } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncProductsResult {
  created: number;
  updated: number;
  skipped: number;
  skippedReasons: string[];
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<PrismaClient, "product" | "recommendation">;

/**
 * Sync Shopify variants into the Zorin product catalog for a merchant.
 * Matches existing products by SKU (case-insensitive) first, so CSV-imported
 * products link up with Shopify variants. Creates new products for unmatched
 * variants. Skips variants with empty SKU.
 */
export async function syncProducts(
  prisma: PrismaSurface,
  merchantId: string,
  variants: ShopifyVariant[],
): Promise<SyncProductsResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const skippedReasons: string[] = [];

  // Separate variants with SKUs from those without
  const withSku: ShopifyVariant[] = [];
  for (const v of variants) {
    if (!v.sku || v.sku.trim() === "") {
      skipped++;
      skippedReasons.push(
        `Variant ${v.id} (product: "${v.product_title}") has no SKU`,
      );
    } else {
      withSku.push(v);
    }
  }

  if (withSku.length === 0) {
    return { created, updated, skipped, skippedReasons };
  }

  // Build a case-insensitive SKU lookup from existing products
  const skus = [...new Set(withSku.map((v) => v.sku))];
  const existing = await prisma.product.findMany({
    where: { merchantId, sku: { in: skus } },
  });
  // Map lowercase SKU → product id for case-insensitive matching
  const skuToId = new Map(existing.map((p) => [p.sku.toLowerCase(), p.id]));

  const touchedIds: string[] = [];

  for (const v of withSku) {
    const priceCents = dollarsToCents(v.price) ?? 0;
    const title =
      v.title === "Default Title"
        ? v.product_title
        : `${v.product_title} - ${v.title}`;
    const shopifyVariantId = String(v.id);

    const existingId = skuToId.get(v.sku.toLowerCase());
    if (existingId) {
      await prisma.product.update({
        where: { id: existingId },
        data: {
          title,
          currentPrice: priceCents,
          shopifyVariantId,
          imageUrl: v.imageUrl,
        },
      });
      touchedIds.push(existingId);
      updated++;
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: v.sku,
          title,
          currentPrice: priceCents,
          shopifyVariantId,
          imageUrl: v.imageUrl,
          category: "Shopify",
        },
      });
      created++;
    }
  }

  if (touchedIds.length > 0) {
    await prisma.recommendation.deleteMany({
      where: { productId: { in: touchedIds } },
    });
  }

  return { created, updated, skipped, skippedReasons };
}
