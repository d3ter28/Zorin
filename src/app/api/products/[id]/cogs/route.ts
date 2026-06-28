import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const cogs: number | null =
    body.cogs === null || body.cogs === "" ? null : Number(body.cogs);

  if (cogs !== null && (!Number.isFinite(cogs) || cogs < 0)) {
    return NextResponse.json({ error: "Invalid cogs" }, { status: 400 });
  }

  await prisma.product.update({ where: { id }, data: { cogs } });
  // Invalidate cached recommendation.
  await prisma.recommendation.deleteMany({ where: { productId: id } });

  return NextResponse.json({ ok: true });
}
