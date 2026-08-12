import type { PrismaClient } from "@prisma/client";
import type { ProductParseResult, RowError } from "./parseProductCsv";

export interface ProductImportSummary {
  inserted: number;
  updated: number;
  skipped: number; // parser errors
  errors: RowError[];
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<PrismaClient, "product" | "recommendation" | "cogsChange">;

/**
 * Apply a parsed product catalog for one merchant: create new SKUs, update
 * existing ones in place, and invalidate recommendations for products whose
 * price/cost changed so the next read regenerates them.
 */
export async function importProducts(
  prisma: PrismaSurface,
  merchantId: string,
  parsed: ProductParseResult,
): Promise<ProductImportSummary> {
  const errors: RowError[] = [...parsed.errors];
  let inserted = 0;
  let updated = 0;

  if (parsed.rows.length === 0) {
    return { inserted, updated, skipped: errors.length, errors };
  }

  const skus = [...new Set(parsed.rows.map((r) => r.sku))];
  const existing = await prisma.product.findMany({
    where: { merchantId, sku: { in: skus } },
  });
  const skuToId = new Map(existing.map((p) => [p.sku, p.id]));

  const touched: string[] = [];
  for (const r of parsed.rows) {
    const id = skuToId.get(r.sku);
    if (id) {
      const before = existing.find((e) => e.id === id);
      const priorCogs = before?.cogs ?? null;
      await prisma.product.update({
        where: { id },
        data: {
          title: r.title,
          currentPrice: r.currentPriceCents,
          category: r.category,
          cogs: r.cogsCents,
          estUnits: r.estUnits,
          imageUrl: r.imageUrl,
        },
      });
      if (r.cogsCents !== null && r.cogsCents !== priorCogs) {
        await prisma.cogsChange.create({
          data: { productId: id, merchantId, fromCents: priorCogs, toCents: r.cogsCents, source: "csv_import" },
        });
      }
      touched.push(id);
      updated++;
    } else {
      const created = await prisma.product.create({
        data: {
          merchantId,
          sku: r.sku,
          title: r.title,
          currentPrice: r.currentPriceCents,
          category: r.category,
          cogs: r.cogsCents,
          estUnits: r.estUnits,
          imageUrl: r.imageUrl,
        },
      });
      if (r.cogsCents !== null) {
        await prisma.cogsChange.create({
          data: { productId: created.id, merchantId, fromCents: null, toCents: r.cogsCents, source: "csv_import" },
        });
      }
      inserted++;
    }
  }

  if (touched.length > 0) {
    await prisma.recommendation.deleteMany({
      where: { productId: { in: touched } },
    });
  }

  return { inserted, updated, skipped: errors.length, errors };
}
