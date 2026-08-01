import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import { generateSurveyToken } from "@/lib/priceSurvey/token";
import { getAppUrl } from "@/lib/appConfig";

function shareUrlFor(token: string): string {
  return `${getAppUrl()}/survey/${token}`;
}

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const token = generateSurveyToken();
    const survey = await prisma.priceSurvey.create({
      data: { productId, merchantId, token },
    });

    return NextResponse.json({
      id: survey.id,
      token: survey.token,
      shareUrl: shareUrlFor(survey.token),
    });
  },
);

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const surveys = await prisma.priceSurvey.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });

    return NextResponse.json(
      surveys.map((s) => ({
        id: s.id,
        shareUrl: shareUrlFor(s.token),
        createdAt: s.createdAt.toISOString(),
        responseCount: s._count.responses,
      })),
    );
  },
);
