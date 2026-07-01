import type { PrismaClient } from "@prisma/client";
import type { ParseResult, RowError } from "./parseCsv";
import { recordObservation } from "../scrape/recordObservation";

export interface IngestSummary {
  inserted: number;
  updated: number;
  skipped: number; // unknown-sku rows + parser errors
  errors: RowError[];
}

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<
  PrismaClient,
  "product" | "competitorPrice" | "recommendation" | "competitorPriceObservation"
>;

/** Apply parsed rows: upsert competitor prices, invalidate touched recommendations. */
export async function applyIngest(
  prisma: PrismaSurface,
  parsed: ParseResult,
): Promise<IngestSummary> {
  const errors: RowError[] = [...parsed.errors];
  let inserted = 0;
  let updated = 0;

  if (parsed.rows.length === 0) {
    return { inserted, updated, skipped: errors.length, errors };
  }

  const skus = [...new Set(parsed.rows.map((r) => r.sku))];
  const products = await prisma.product.findMany({ where: { sku: { in: skus } } });
  const skuToId = new Map(products.map((p) => [p.sku, p.id]));
  const productIds = [...new Set(products.map((p) => p.id))];

  const existing = productIds.length
    ? await prisma.competitorPrice.findMany({ where: { productId: { in: productIds } } })
    : [];
  const existingKeys = new Set(
    existing.map((c) => `${c.productId}::${c.competitorName}`),
  );

  const touched = new Set<string>();
  for (const row of parsed.rows) {
    const productId = skuToId.get(row.sku);
    if (!productId) {
      errors.push({ line: row.line, raw: row.sku, reason: `unknown sku: ${row.sku}` });
      continue;
    }
    const key = `${productId}::${row.competitorName}`;
    if (existingKeys.has(key)) updated++;
    else inserted++;

    await recordObservation(prisma, {
      productId,
      competitorName: row.competitorName,
      competitorUrl: row.competitorUrl ?? "",
      priceCents: row.priceCents,
      source: "csv",
    });
    touched.add(productId);
  }

  if (touched.size > 0) {
    await prisma.recommendation.deleteMany({
      where: { productId: { in: [...touched] } },
    });
  }

  return { inserted, updated, skipped: errors.length, errors };
}
