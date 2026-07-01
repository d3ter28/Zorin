import type { PrismaClient } from "@prisma/client";
import { scrapeOne as defaultScrapeOne, type ScrapeResult } from "./scrapeOne";
import { recordObservation } from "./recordObservation";
import { markStale } from "./staleness";

type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation" | "recommendation"
>;

export interface CompetitorRefreshResult {
  competitorName: string;
  ok: boolean;
  priceCents?: number;
  reason?: string;
}

export interface RefreshSummary {
  productId: string;
  refreshed: number;
  failed: number;
  results: CompetitorRefreshResult[];
}

interface Deps {
  scrapeOne?: (url: string, lastCents: number | null) => Promise<ScrapeResult>;
  now?: Date;
}

/**
 * Refresh every competitor URL for one product: scrape, record successes
 * (history + projection), preserve last-good prices on failure, recompute
 * staleness, and invalidate the stored recommendation if anything changed.
 */
export async function refreshProduct(
  prisma: PrismaSurface,
  productId: string,
  deps: Deps = {},
): Promise<RefreshSummary> {
  const scrapeOne = deps.scrapeOne ?? defaultScrapeOne;
  const now = deps.now ?? new Date();

  const competitors = await prisma.competitorPrice.findMany({ where: { productId } });
  const results: CompetitorRefreshResult[] = [];
  let refreshed = 0;
  let failed = 0;

  for (const c of competitors) {
    if (!c.competitorUrl) {
      results.push({ competitorName: c.competitorName, ok: false, reason: "no_url" });
      failed++;
      continue;
    }
    const res = await scrapeOne(c.competitorUrl, c.price);
    if (res.ok) {
      await recordObservation(prisma, {
        productId,
        competitorName: c.competitorName,
        competitorUrl: c.competitorUrl,
        priceCents: res.priceCents,
        source: "scrape",
        now,
      });
      results.push({ competitorName: c.competitorName, ok: true, priceCents: res.priceCents });
      refreshed++;
    } else {
      results.push({ competitorName: c.competitorName, ok: false, reason: res.reason });
      failed++;
    }
  }

  await markStale(prisma, productId, now);

  if (refreshed > 0) {
    await prisma.recommendation.deleteMany({ where: { productId } });
  }

  return { productId, refreshed, failed, results };
}
