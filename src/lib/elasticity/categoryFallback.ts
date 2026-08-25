import type { PrismaClient } from "@prisma/client";
import { GLOBAL_PRIOR_ELASTICITY } from "./bayesianShrinkage";

export interface SiblingElasticity {
  elasticity: number;
  confidenceScore: number;
}

/** Minimum confidenceScore a sibling's ElasticityModel must have to count toward a fallback. */
export const MIN_SIBLING_CONFIDENCE = 0.4;

export interface FallbackSelection {
  elasticity: number | null;
  qualifyingCount: number;
}

/**
 * Picks a fallback elasticity from sibling products' real ElasticityModel data.
 *
 * Requires at least 3 siblings with confidenceScore >= MIN_SIBLING_CONFIDENCE;
 * returns the median elasticity of those qualifying siblings (elasticity: null
 * if fewer than 3 qualify), plus the qualifying count so callers never have to
 * re-filter/re-count separately and risk it drifting out of sync.
 */
export function selectFallbackElasticity(siblings: SiblingElasticity[]): FallbackSelection {
  const qualifying = siblings.filter((s) => s.confidenceScore >= MIN_SIBLING_CONFIDENCE);
  if (qualifying.length < 3) {
    return { elasticity: null, qualifyingCount: qualifying.length };
  }

  const sorted = [...qualifying].sort((a, b) => a.elasticity - b.elasticity).map((s) => s.elasticity);
  const mid = Math.floor(sorted.length / 2);
  const elasticity = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { elasticity, qualifyingCount: qualifying.length };
}

export interface CategoryFallbackResult {
  elasticity: number;
  level: "category" | "catalog" | "global";
  sourceCount: number;
  categoryName?: string;
}

type PrismaSurface = Pick<PrismaClient, "product">;

type SiblingRow = {
  elasticityModel: { elasticity: number; confidenceScore: number } | null;
};

function toSiblingElasticities(rows: SiblingRow[]): SiblingElasticity[] {
  return rows
    .filter((r) => r.elasticityModel !== null)
    .map((r) => ({
      elasticity: r.elasticityModel!.elasticity,
      confidenceScore: r.elasticityModel!.confidenceScore,
    }));
}

/**
 * Computes a fallback elasticity for a SKU that can't be fit on its own,
 * cascading category siblings -> whole-catalog siblings -> global prior.
 *
 * Trust boundary: callers must already have verified that `productId` belongs
 * to `merchantId` (e.g. via `assertProductOwned`) before calling this — it does
 * not re-verify ownership itself.
 */
export async function computeCategoryFallback(
  prisma: PrismaSurface,
  merchantId: string,
  productId: string
): Promise<CategoryFallbackResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true },
  });
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const categorySiblingRows = await prisma.product.findMany({
    where: {
      merchantId,
      category: product.category,
      id: { not: productId },
    },
    select: { elasticityModel: { select: { elasticity: true, confidenceScore: true } } },
  });
  const categorySiblings = toSiblingElasticities(categorySiblingRows);
  const categoryResult = selectFallbackElasticity(categorySiblings);
  if (categoryResult.elasticity !== null) {
    return {
      elasticity: categoryResult.elasticity,
      level: "category",
      sourceCount: categoryResult.qualifyingCount,
      categoryName: product.category,
    };
  }

  const catalogSiblingRows = await prisma.product.findMany({
    where: {
      merchantId,
      id: { not: productId },
    },
    select: { elasticityModel: { select: { elasticity: true, confidenceScore: true } } },
  });
  const catalogSiblings = toSiblingElasticities(catalogSiblingRows);
  const catalogResult = selectFallbackElasticity(catalogSiblings);
  if (catalogResult.elasticity !== null) {
    return {
      elasticity: catalogResult.elasticity,
      level: "catalog",
      sourceCount: catalogResult.qualifyingCount,
    };
  }

  return {
    elasticity: GLOBAL_PRIOR_ELASTICITY,
    level: "global",
    sourceCount: 0,
  };
}
