import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { marginPct } from "@/lib/margin";
import { compare } from "@/lib/comparison";
import { decideForProduct } from "@/lib/recommendation";
import { requireSessionApi } from "@/lib/auth/requireSession";

export async function GET() {
  const { merchantId } = await requireSessionApi();
  const products = await prisma.product.findMany({
    where: { merchantId },
    include: { competitors: true },
    orderBy: { title: "asc" },
  });

  const rows = products.map((p) => {
    // Exclude stale competitors so the displayed median/position matches the
    // recommendation, which also filters them out (see decideForProduct).
    const obs = p.competitors
      .filter((c) => !c.isStale)
      .map((c) => ({
        price: c.price,
        observedAt: c.observedAt.toISOString(),
      }));
    const decision = decideForProduct(p);
    return {
      id: p.id,
      title: p.title,
      sku: p.sku,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      category: p.category,
      estUnits: p.estUnits,
      margin: marginPct(p.currentPrice, p.cogs),
      comparison: compare(p.currentPrice, obs),
      recommendedAction: decision.action,
      suggestedPrice: decision.suggestedPrice,
    };
  });

  return NextResponse.json(rows);
}
