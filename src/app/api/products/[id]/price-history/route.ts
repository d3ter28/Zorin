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

    const changes = await prisma.priceChange.findMany({
      where: { productId: id },
      orderBy: { appliedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(
      changes.map((c) => ({
        id: c.id,
        fromCents: c.fromCents,
        toCents: c.toCents,
        appliedAt: c.appliedAt.toISOString(),
      })),
    );
  },
);
