import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;

    const survey = await prisma.priceSurvey.findUnique({
      where: { token },
      select: { id: true, product: { select: { title: true, imageUrl: true } } },
    });
    if (!survey) throw new HttpError(404, "Survey not found");

    return NextResponse.json({
      productTitle: survey.product.title,
      productImageUrl: survey.product.imageUrl,
    });
  },
);
