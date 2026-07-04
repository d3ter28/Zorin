import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;

    // Verify the product belongs to this merchant.
    const product = await prisma.product.findFirst({
      where: { id, merchantId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(null, { status: 404 });
    }

    const rec = await prisma.recommendation.findUnique({
      where: { productId: id },
    });
    if (!rec) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json({
      action: rec.action,
      phrasing: rec.phrasing,
      rulesJson: rec.rulesJson,
    });
  },
);
