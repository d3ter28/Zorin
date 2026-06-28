import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: { competitors: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: p.id,
    title: p.title,
    currentPrice: p.currentPrice,
    cogs: p.cogs,
    competitors: p.competitors.map((c) => ({
      name: c.competitorName,
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    })),
  });
}
