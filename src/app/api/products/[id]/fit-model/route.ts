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

    const result = fitElasticityModel(records);
    if (!result) {
      throw new HttpError(
        400,
        "Insufficient data: need at least 3 non-promotional sales records with positive price and units",
      );
    }

    await prisma.elasticityModel.upsert({
      where: { productId: id },
      create: { productId: id, ...result, fittedAt: new Date() },
      update: { ...result, fittedAt: new Date() },
    });

    return NextResponse.json(result);
  },
);
