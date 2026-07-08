import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      select: { currentPrice: true, elasticityModel: true },
    });
    if (!product) throw new HttpError(404, "Not found");

    if (!product.elasticityModel) {
      return NextResponse.json(null, { status: 404 });
    }

    const { elasticity, intercept, r2, dataPoints, confidenceScore } = product.elasticityModel;

    return NextResponse.json({
      elasticity,
      intercept,
      r2,
      dataPoints,
      confidenceScore,
      currentPriceCents: product.currentPrice,
    });
  },
);
