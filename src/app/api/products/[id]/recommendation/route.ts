import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decideForProduct } from "@/lib/recommendation";
import { phraseRecommendation } from "@/lib/ai/phrase";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { competitors: true },
    });
    if (!product) {
      throw new HttpError(404, "Not found");
    }

    const decision = decideForProduct(product);
    const phrasing = await phraseRecommendation(decision);

    const saved = await prisma.recommendation.upsert({
      where: { productId: id },
      create: {
        productId: id,
        action: decision.action,
        deltaPct: decision.deltaPct,
        rulesJson: JSON.stringify(decision),
        phrasing,
      },
      update: {
        action: decision.action,
        deltaPct: decision.deltaPct,
        rulesJson: JSON.stringify(decision),
        phrasing,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({
      decision,
      phrasing,
      generatedAt: saved.generatedAt,
    });
  },
);
