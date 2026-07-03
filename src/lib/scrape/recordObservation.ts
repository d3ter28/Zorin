import type { PrismaClient } from "@prisma/client";

/** Minimal Prisma surface this function needs (real client is assignable). */
type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation"
>;

export interface ObservationInput {
  productId: string;
  competitorName: string;
  competitorUrl: string;
  priceCents: number;
  source: "csv" | "scrape" | "discovery";
  now?: Date;
}

/**
 * The single persistence path for a confirmed competitor price, shared by CSV
 * ingest and scraping. Appends an immutable history row AND upserts the
 * "latest price" projection the decision engine reads, clearing staleness.
 */
export async function recordObservation(
  prisma: PrismaSurface,
  input: ObservationInput,
): Promise<void> {
  const { productId, competitorName, competitorUrl, priceCents, source } = input;
  const now = input.now ?? new Date();

  await prisma.competitorPriceObservation.create({
    data: { productId, competitorName, competitorUrl, price: priceCents, source, observedAt: now },
  });

  await prisma.competitorPrice.upsert({
    where: { productId_competitorName: { productId, competitorName } },
    create: {
      productId,
      competitorName,
      competitorUrl,
      price: priceCents,
      observedAt: now,
      lastObservedAt: now,
      isStale: false,
    },
    update: {
      competitorUrl,
      price: priceCents,
      observedAt: now,
      lastObservedAt: now,
      isStale: false,
    },
  });
}
