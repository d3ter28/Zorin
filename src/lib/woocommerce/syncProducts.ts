import type { PrismaClient } from "@prisma/client";
import type { WooNormalizedProduct } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncWooProductsResult {
  created: number;
  updated: number;
  skipped: number;
  skippedReasons: string[];
}

type PrismaSurface = Pick<PrismaClient, "product" | "recommendation">;

export async function syncWooProducts(
  prisma: PrismaSurface,
  merchantId: string,
  products: WooNormalizedProduct[],
): Promise<SyncWooProductsResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const skippedReasons: string[] = [];

  const withSku = products.filter((p) => {
    if (!p.sku || p.sku.trim() === "") {
      skipped++;
      skippedReasons.push(`Product ${p.id} ("${p.name}") has no SKU`);
      return false;
    }
    return true;
  });

  if (withSku.length === 0) return { created, updated, skipped, skippedReasons };

  const skus = [...new Set(withSku.map((p) => p.sku))];
  const existing = await prisma.product.findMany({
    where: { merchantId, sku: { in: skus } },
  });
  const skuToId = new Map(existing.map((p) => [p.sku.toLowerCase(), p.id]));

  const touchedIds: string[] = [];

  for (const p of withSku) {
    const currentPrice = dollarsToCents(p.regularPriceDollars) ?? 0;
    const woocommerceVariantId = String(p.id);
    const woocommerceParentId = p.parentId !== null ? String(p.parentId) : null;

    const existingId = skuToId.get(p.sku.toLowerCase());
    if (existingId) {
      await prisma.product.update({
        where: { id: existingId },
        data: { title: p.name, currentPrice, woocommerceVariantId, woocommerceParentId },
      });
      touchedIds.push(existingId);
      updated++;
    } else {
      await prisma.product.create({
        data: {
          merchantId,
          sku: p.sku,
          title: p.name,
          currentPrice,
          woocommerceVariantId,
          woocommerceParentId,
          category: "WooCommerce",
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
