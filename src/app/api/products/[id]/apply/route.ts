import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { decideForProduct } from "@/lib/recommendation";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { competitors: true },
    });
    if (!product) {
      throw new HttpError(404, "Not found");
    }

    const decision = decideForProduct(product);
    const changed = decision.suggestedPrice !== product.currentPrice;
    if (changed) {
      await prisma.product.update({
        where: { id },
        data: { currentPrice: decision.suggestedPrice },
      });
      await prisma.recommendation.deleteMany({ where: { productId: id } });
    }

    return NextResponse.json({
      currentPrice: decision.suggestedPrice,
      action: decision.action,
      applied: changed,
    });
  },
);
