import type { PrismaClient } from "@prisma/client";

/** A confirmed price older than this stops feeding the decision engine. */
export const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function isStale(lastObservedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastObservedAt.getTime() > STALE_AFTER_MS;
}

type PrismaSurface = Pick<PrismaClient, "competitorPrice">;

/** Recompute and persist `isStale` for every competitor of one product. */
export async function markStale(
  prisma: PrismaSurface,
  productId: string,
  now: Date = new Date(),
): Promise<void> {
  const rows = await prisma.competitorPrice.findMany({ where: { productId } });
  for (const row of rows) {
    const stale = isStale(row.lastObservedAt, now);
    if (stale !== row.isStale) {
      await prisma.competitorPrice.update({
        where: { id: row.id },
        data: { isStale: stale },
      });
    }
  }
}
