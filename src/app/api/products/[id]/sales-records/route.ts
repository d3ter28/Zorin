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
      select: { id: true },
    });
    if (!product) throw new HttpError(404, "Not found");

    const records = await prisma.salesRecord.findMany({
      where: { productId: id },
      orderBy: { date: "desc" },
      take: 100,
      select: { id: true, date: true, priceCents: true, unitsSold: true, promotionFlag: true },
    });

    return NextResponse.json(
      records.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        priceCents: r.priceCents,
        unitsSold: r.unitsSold,
        promotionFlag: r.promotionFlag,
      })),
    );
  },
);
