import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { generateRecommendation, type PricingRecommendation } from "@/lib/elasticity/generateRecommendation";
import { computeCategoryFallback } from "@/lib/elasticity/categoryFallback";

interface ModelFields {
  elasticity: number;
  r2: number | null;
  dataPoints: number;
  confidenceScore: number;
}

/**
 * Shared tail of both the real-model and fallback branches: builds rulesJson from
 * the recommendation plus the model fields that produced it, upserts the
 * Recommendation row, and returns the JSON response. `extra` carries fields that
 * only the fallback branch adds (fallbackLevel etc.) — merged into both the
 * persisted rulesJson and the response body, but a no-op for the real-model path.
 */
async function persistAndRespond(
  id: string,
  rec: PricingRecommendation,
  modelFields: ModelFields,
  extra: Record<string, unknown> = {}
) {
  const rulesJson = JSON.stringify({
    suggestedPriceCents: rec.suggestedPriceCents,
    expectedProfitLiftPct: rec.expectedProfitLiftPct,
    elasticity: modelFields.elasticity,
    r2: modelFields.r2,
    dataPoints: modelFields.dataPoints,
    confidenceScore: modelFields.confidenceScore,
    currentUnitsEstimate: rec.currentUnitsEstimate,
    projectedUnitsEstimate: rec.projectedUnitsEstimate,
    currentProfitCents: rec.currentProfitCents,
    projectedProfitCents: rec.projectedProfitCents,
    profitLiftCents: rec.profitLiftCents,
    ...extra,
  });

  await prisma.recommendation.upsert({
    where: { productId: id },
    create: { productId: id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
    update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
  });

  return NextResponse.json({ ...rec, ...extra });
}

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      include: { elasticityModel: true },
    });
    if (!product) throw new HttpError(404, "Not found");
    if (product.cogs === null) throw new HttpError(400, "COGS required to generate recommendation");

    if (product.elasticityModel) {
      const confidenceScore = product.elasticityModel.confidenceScore ?? 1.0;
      const rec = generateRecommendation(
        product.elasticityModel,
        product.currentPrice,
        product.cogs,
        0.10,
        confidenceScore
      );

      return persistAndRespond(id, rec, {
        elasticity: product.elasticityModel.elasticity,
        r2: product.elasticityModel.r2,
        dataPoints: product.elasticityModel.dataPoints,
        confidenceScore,
      });
    }

    // No real per-SKU model — try the category/catalog/global fallback.
    const records = await prisma.salesRecord.findMany({
      where: { productId: id, promotionFlag: false },
      select: { unitsSold: true },
    });

    const avgUnits =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.unitsSold, 0) / records.length
        : (product.estUnits ?? null);

    if (avgUnits === null || avgUnits <= 0) {
      throw new HttpError(400, "No elasticity model — fit model first");
    }

    const fallback = await computeCategoryFallback(prisma, merchantId, id);

    // The fallback elasticity has no fitted intercept of its own — back-solve one so the
    // log-linear demand curve (ln(units) = intercept + elasticity * ln(price)) passes
    // through this product's own (currentPrice, avgUnits) as its anchor point.
    const intercept = Math.log(avgUnits) - fallback.elasticity * Math.log(product.currentPrice);

    const rec = generateRecommendation(
      { elasticity: fallback.elasticity, intercept, r2: 0, dataPoints: 0 },
      product.currentPrice,
      product.cogs,
      0.10,
      0
    );

    return persistAndRespond(
      id,
      rec,
      { elasticity: fallback.elasticity, r2: null, dataPoints: 0, confidenceScore: 0 },
      {
        fallbackLevel: fallback.level,
        fallbackCategoryName: fallback.categoryName,
        fallbackSourceCount: fallback.sourceCount,
      }
    );
  }
);
