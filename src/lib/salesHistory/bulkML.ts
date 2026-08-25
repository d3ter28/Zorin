import type { PrismaClient } from "@prisma/client";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";
import { bayesianShrinkage } from "@/lib/elasticity/bayesianShrinkage";
import { computeConfidenceScore } from "@/lib/elasticity/confidenceScore";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";
import { computeCategoryFallback } from "@/lib/elasticity/categoryFallback";

export interface BulkMLResult {
  fitted: number;
  recommended: number;
  fitSkipped: string[];
  recommendSkipped: string[];
}

type PrismaSurface = Pick<PrismaClient, "product" | "salesRecord" | "elasticityModel" | "recommendation">;

export async function runBulkML(
  prisma: PrismaSurface,
  productIds: string[],
): Promise<BulkMLResult> {
  const result: BulkMLResult = { fitted: 0, recommended: 0, fitSkipped: [], recommendSkipped: [] };
  if (productIds.length === 0) return result;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, currentPrice: true, cogs: true, merchantId: true, estUnits: true },
  });

  for (const product of products) {
    // Sequential per-product query — acceptable for typical batch sizes (<100 products)
    const records = await prisma.salesRecord.findMany({
      where: { productId: product.id, promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    const raw = fitElasticityModel(records);
    if (!raw) {
      const avgUnits = records.length > 0
        ? records.reduce((sum, r) => sum + r.unitsSold, 0) / records.length
        : null;
      const baselineUnits = avgUnits ?? product.estUnits ?? null;

      if (baselineUnits == null || baselineUnits <= 0) {
        result.fitSkipped.push(product.title);
        continue;
      }

      if (product.cogs == null) {
        result.recommendSkipped.push(product.title);
        continue;
      }

      const fallback = await computeCategoryFallback(prisma, product.merchantId, product.id);
      const intercept = Math.log(baselineUnits) - fallback.elasticity * Math.log(product.currentPrice);

      const fallbackRec = generateRecommendation(
        { elasticity: fallback.elasticity, intercept, r2: 0, dataPoints: 0 },
        product.currentPrice,
        product.cogs,
        0.10,
        0,
      );

      const fallbackRulesJson = JSON.stringify({
        suggestedPriceCents: fallbackRec.suggestedPriceCents,
        expectedProfitLiftPct: fallbackRec.expectedProfitLiftPct,
        elasticity: fallback.elasticity,
        r2: null,
        dataPoints: 0,
        confidenceScore: 0,
        fallbackLevel: fallback.level,
        fallbackSourceCount: fallback.sourceCount,
        fallbackCategoryName: fallback.categoryName,
        currentUnitsEstimate: fallbackRec.currentUnitsEstimate,
        projectedUnitsEstimate: fallbackRec.projectedUnitsEstimate,
        currentProfitCents: fallbackRec.currentProfitCents,
        projectedProfitCents: fallbackRec.projectedProfitCents,
        profitLiftCents: fallbackRec.profitLiftCents,
      });

      await prisma.recommendation.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          action: fallbackRec.action,
          deltaPct: fallbackRec.deltaPct,
          phrasing: fallbackRec.reasoning,
          rulesJson: fallbackRulesJson,
        },
        update: {
          action: fallbackRec.action,
          deltaPct: fallbackRec.deltaPct,
          phrasing: fallbackRec.reasoning,
          rulesJson: fallbackRulesJson,
          generatedAt: new Date(),
        },
      });
      result.recommended++;
      continue;
    }

    const { shrunkElasticity, priorApplied } = bayesianShrinkage(raw.elasticity, raw.effectiveSampleSize);
    const confidenceScore = computeConfidenceScore(raw.r2, raw.effectiveSampleSize);
    const adjustedIntercept = raw.weightedMeanLogUnits - shrunkElasticity * raw.weightedMeanLogPrice;

    const modelData = {
      elasticity: shrunkElasticity,
      intercept: adjustedIntercept,
      r2: raw.r2,
      dataPoints: raw.dataPoints,
      effectiveSampleSize: raw.effectiveSampleSize,
      minPriceCents: raw.minPriceCents,
      maxPriceCents: raw.maxPriceCents,
      confidenceScore,
      priorApplied,
      fittedAt: new Date(),
    };

    await prisma.elasticityModel.upsert({
      where: { productId: product.id },
      create: { productId: product.id, ...modelData },
      update: modelData,
    });
    result.fitted++;

    if (product.cogs == null) {
      result.recommendSkipped.push(product.title);
      continue;
    }

    const rec = generateRecommendation(
      modelData,
      product.currentPrice,
      product.cogs,
      0.10,
      confidenceScore,
    );

    const rulesJson = JSON.stringify({
      suggestedPriceCents: rec.suggestedPriceCents,
      expectedProfitLiftPct: rec.expectedProfitLiftPct,
      elasticity: shrunkElasticity,
      r2: raw.r2,
      dataPoints: raw.dataPoints,
      confidenceScore,
      currentUnitsEstimate: rec.currentUnitsEstimate,
      projectedUnitsEstimate: rec.projectedUnitsEstimate,
      currentProfitCents: rec.currentProfitCents,
      projectedProfitCents: rec.projectedProfitCents,
      profitLiftCents: rec.profitLiftCents,
    });

    await prisma.recommendation.upsert({
      where: { productId: product.id },
      create: { productId: product.id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
      update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
    });
    result.recommended++;
  }

  return result;
}
