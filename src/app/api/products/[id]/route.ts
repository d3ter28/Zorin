import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const p = await prisma.product.findUnique({
      where: { id },
      include: { competitors: true },
    });
    if (!p) throw new HttpError(404, "Not found");
    return NextResponse.json({
      id: p.id,
      title: p.title,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      competitors: p.competitors.map((c) => ({
        name: c.competitorName,
        price: c.price,
        observedAt: c.observedAt.toISOString(),
        url: c.competitorUrl ?? "",
        lastObservedAt: c.lastObservedAt.toISOString(),
        isStale: c.isStale,
      })),
    });
  },
);
