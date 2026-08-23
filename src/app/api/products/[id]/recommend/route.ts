import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { generateRecommendation } from "@/lib/elasticity/generateRecommendation";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      include: { elasticityModel: true },
    });
    if (!product) throw new HttpError(404, "Not found");
    if (!product.elasticityModel) throw new HttpError(400, "No elasticity model — fit model first");
    if (product.cogs === null) throw new HttpError(400, "COGS required to generate recommendation");

    const confidenceScore = product.elasticityModel.confidenceScore ?? 1.0;

    const rec = generateRecommendation(
      product.elasticityModel,
      product.currentPrice,
      product.cogs,
      0.10,
      confidenceScore
    );

    const rulesJson = JSON.stringify({
      suggestedPriceCents: rec.suggestedPriceCents,
      expectedProfitLiftPct: rec.expectedProfitLiftPct,
      elasticity: product.elasticityModel.elasticity,
      r2: product.elasticityModel.r2,
      dataPoints: product.elasticityModel.dataPoints,
      confidenceScore,
      currentUnitsEstimate: rec.currentUnitsEstimate,
      projectedUnitsEstimate: rec.projectedUnitsEstimate,
      currentProfitCents: rec.currentProfitCents,
      projectedProfitCents: rec.projectedProfitCents,
      profitLiftCents: rec.profitLiftCents,
    });

    await prisma.recommendation.upsert({
      where: { productId: id },
      create: { productId: id, action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson },
      update: { action: rec.action, deltaPct: rec.deltaPct, phrasing: rec.reasoning, rulesJson, generatedAt: new Date() },
    });

    return NextResponse.json(rec);
  }
);
