import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { fitElasticityModel } from "@/lib/elasticity/fitElasticityModel";

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
      select: { priceCents: true, unitsSold: true },
    });

    const raw = fitElasticityModel(records);
    if (!raw) {
      throw new HttpError(
        400,
        "Insufficient data: need at least 3 non-promotional sales records with positive price and units",
      );
    }

    // Destructure only the fields that exist in the current DB schema.
    // effectiveSampleSize (added in Task 1) and confidenceScore/priorApplied
    // (Task 3) are intentionally excluded until the schema migration in Task 3.
    const { elasticity, intercept, r2, dataPoints, minPriceCents, maxPriceCents } = raw;

    await prisma.elasticityModel.upsert({
      where: { productId: id },
      create: { productId: id, elasticity, intercept, r2, dataPoints, minPriceCents, maxPriceCents, fittedAt: new Date() },
      update: { elasticity, intercept, r2, dataPoints, minPriceCents, maxPriceCents, fittedAt: new Date() },
    });

    const result = raw;

    return NextResponse.json(result);
  },
);
