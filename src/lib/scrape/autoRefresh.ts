import type { PrismaClient } from "@prisma/client";
import { refreshProduct as defaultRefreshProduct } from "./refreshProduct";

// Re-scrape a competitor price once it is older than this (well under the 14-day staleness cutoff).
export const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
export const TICK_MS = 60 * 60 * 1000;

type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation" | "recommendation"
>;

export async function findDueProductIds(
  prisma: PrismaSurface,
  now: Date = new Date(),
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - REFRESH_AFTER_MS);
  const rows = await prisma.competitorPrice.findMany({
    where: { competitorUrl: { not: null }, lastObservedAt: { lt: cutoff } },
    select: { productId: true },
  });
  return [...new Set(rows.map((r) => r.productId))];
}
