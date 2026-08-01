import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import { calculateVanWestendorp } from "@/lib/priceSurvey/vanWestendorp";

export const GET = withErrorHandling(
  async (
    _req: Request,
    { params }: { params: Promise<{ id: string; surveyId: string }> },
  ) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId, surveyId } = await params;
    await assertProductOwned(prisma, productId, merchantId);

    const survey = await prisma.priceSurvey.findUnique({
      where: { id: surveyId },
      include: { responses: true },
    });

    if (!survey || survey.productId !== productId) {
      throw new HttpError(404, "Not found");
    }

    const result = calculateVanWestendorp(
      survey.responses.map((r) => ({
        tooCheapCents: r.tooCheapCents,
        goodValueCents: r.goodValueCents,
        gettingExpensiveCents: r.gettingExpensiveCents,
        tooExpensiveCents: r.tooExpensiveCents,
      })),
    );

    return NextResponse.json(result);
  },
);
