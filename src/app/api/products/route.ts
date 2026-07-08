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
    include: { elasticityModel: true, recommendation: true },
  });

  const rows = products.map((p) => {
    let recommendedAction: "raise" | "lower" | "hold" | null = null;
    let suggestedPrice: number | null = null;
    if (p.recommendation) {
      recommendedAction = p.recommendation.action as "raise" | "lower" | "hold";
      try {
        const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents: number };
        suggestedPrice = rules.suggestedPriceCents ?? null;
      } catch {}
    }
    return {
      id: p.id,
      title: p.title,
      sku: p.sku,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      category: p.category,
      estUnits: p.estUnits,
      margin: marginPct(p.currentPrice, p.cogs),
      modelHealth: p.elasticityModel
        ? {
            r2: p.elasticityModel.r2,
            dataPoints: p.elasticityModel.dataPoints,
            confidenceScore: p.elasticityModel.confidenceScore,
          }
        : null,
      recommendedAction,
      suggestedPrice,
    };
  });

  return NextResponse.json(rows);
});
