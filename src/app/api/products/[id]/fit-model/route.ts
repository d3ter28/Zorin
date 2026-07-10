import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";
import { bayesianShrinkage } from "@/lib/elasticity/bayesianShrinkage";
import { computeConfidenceScore } from "@/lib/elasticity/confidenceScore";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
    });
    if (!product) {
      throw new HttpError(404, "Not found");
    }

    const records = await prisma.salesRecord.findMany({
      where: { productId: id, promotionFlag: false },
      select: { priceCents: true, unitsSold: true, date: true },
    });

    const raw = fitElasticityModel(records);
    if (!raw) {
      throw new HttpError(
        400,
        "Insufficient data: need at least 3 non-promotional sales records with positive price and units",
      );
    }

    const { shrunkElasticity, priorApplied } = bayesianShrinkage(
      raw.elasticity,
      raw.effectiveSampleSize
    );
    const confidenceScore = computeConfidenceScore(raw.r2, raw.effectiveSampleSize);

    // Recompute intercept so the shrunk model still passes through the data centroid.
    // Original: intercept_raw = ȳ - elasticity_raw * x̄
    // Adjusted: intercept_adj = ȳ - elasticity_shrunk * x̄
    const adjustedIntercept =
      raw.weightedMeanLogUnits - shrunkElasticity * raw.weightedMeanLogPrice;

    const result = {
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
      where: { productId: id },
      create: { productId: id, ...result },
      update: result,
    });

    return NextResponse.json({ ...raw, elasticity: shrunkElasticity, confidenceScore, priorApplied });
  }
);
