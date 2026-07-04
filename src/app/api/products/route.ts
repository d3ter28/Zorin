import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { marginPct } from "@/lib/margin";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { withErrorHandling } from "@/lib/api/errors";

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();
  const products = await prisma.product.findMany({
    where: { merchantId },
    orderBy: { title: "asc" },
  });

  const rows = products.map((p) => ({
    id: p.id,
    title: p.title,
    sku: p.sku,
    currentPrice: p.currentPrice,
    cogs: p.cogs,
    category: p.category,
    estUnits: p.estUnits,
    margin: marginPct(p.currentPrice, p.cogs),
  }));

  return NextResponse.json(rows);
});
