import type { PrismaClient } from "@prisma/client";
import type { ParsedSalesRow } from "./parseSalesHistoryCsv";

export interface ImportResult {
  imported: number;
  unknownSkus: string[];
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<PrismaClient, "product" | "salesRecord">;

/**
 * Apply parsed sales history rows for one merchant: match each row's SKU to
 * an existing product and upsert a SalesRecord keyed on (productId, date).
 * Rows whose SKU doesn't match any product are collected in `unknownSkus`
 * rather than treated as errors.
 */
export async function importSalesHistory(
  prisma: PrismaSurface,
  merchantId: string,
  rows: ParsedSalesRow[],
): Promise<ImportResult> {
  const products = await prisma.product.findMany({
    where: { merchantId },
    select: { id: true, sku: true },
  });
  const skuToId = new Map(products.map((p) => [p.sku, p.id]));

  const unknownSkus: string[] = [];
  let imported = 0;

  for (const row of rows) {
    const productId = skuToId.get(row.sku);
    if (!productId) {
      if (!unknownSkus.includes(row.sku)) unknownSkus.push(row.sku);
      continue;
    }
    await prisma.salesRecord.upsert({
      where: { productId_date: { productId, date: row.date } },
      create: {
        productId,
        merchantId,
        date: row.date,
        unitsSold: row.unitsSold,
        priceCents: row.priceCents,
      },
      update: {
        unitsSold: row.unitsSold,
        priceCents: row.priceCents,
      },
    });
    imported++;
  }

  return { imported, unknownSkus };
}
