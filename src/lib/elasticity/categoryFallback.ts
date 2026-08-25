import type { PrismaClient } from "@prisma/client";
import { GLOBAL_PRIOR_ELASTICITY } from "./bayesianShrinkage";

export interface SiblingElasticity {
  elasticity: number;
  confidenceScore: number;
}

/**
 * Picks a fallback elasticity from sibling products' real ElasticityModel data.
 *
 * Requires at least 3 siblings with confidenceScore >= 0.4; returns the median
 * elasticity of those qualifying siblings, or null if fewer than 3 qualify.
 */
export function selectFallbackElasticity(siblings: SiblingElasticity[]): number | null {
  const qualifying = siblings.filter((s) => s.confidenceScore >= 0.4);
  if (qualifying.length < 3) return null;

  const sorted = [...qualifying].sort((a, b) => a.elasticity - b.elasticity).map((s) => s.elasticity);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
  const categoryElasticity = selectFallbackElasticity(categorySiblings);
  if (categoryElasticity !== null) {
    const sourceCount = categorySiblings.filter((s) => s.confidenceScore >= 0.4).length;
    return {
      elasticity: categoryElasticity,
      level: "category",
      sourceCount,
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
  const catalogElasticity = selectFallbackElasticity(catalogSiblings);
  if (catalogElasticity !== null) {
    const sourceCount = catalogSiblings.filter((s) => s.confidenceScore >= 0.4).length;
    return {
      elasticity: catalogElasticity,
      level: "catalog",
      sourceCount,
    };
  }

  return {
    elasticity: GLOBAL_PRIOR_ELASTICITY,
    level: "global",
    sourceCount: 0,
  };
}
