import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { marginPct } from "@/lib/margin";
import { compare } from "@/lib/comparison";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { competitors: true, recommendation: true },
    orderBy: { title: "asc" },
  });

  const rows = products.map((p) => {
    const obs = p.competitors.map((c) => ({
      price: c.price,
      observedAt: c.observedAt.toISOString(),
    }));
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
      recommendationAction: p.recommendation?.action ?? null,
    };
  });

  return NextResponse.json(rows);
}
