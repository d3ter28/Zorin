import type { PrismaClient } from "@prisma/client";
import type { WooNormalizedProduct } from "./client";
import { dollarsToCents } from "@/lib/money";

export interface SyncWooProductsResult {
  created: number;
  updated: number;
  skipped: number;
}

type PrismaSurface = Pick<PrismaClient, "product">;

export async function syncWooProducts(
  prisma: PrismaSurface,
  merchantId: string,
  products: WooNormalizedProduct[],
): Promise<SyncWooProductsResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const withSku = products.filter((p) => {
    if (!p.sku || p.sku.trim() === "") {
      skipped++;
      return false;
    }
    return true;
  });

  if (withSku.length === 0) return { created, updated, skipped };

  const skus = [...new Set(withSku.map((p) => p.sku))];
  const existing = await prisma.product.findMany({
    where: { merchantId, sku: { in: skus } },
  });
  const skuToId = new Map(existing.map((p) => [p.sku.toLowerCase(), p.id]));

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

  return { created, updated, skipped };
}
