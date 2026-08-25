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
    let isFallback = false;
    if (p.recommendation) {
      recommendedAction = p.recommendation.action as "raise" | "lower" | "hold";
      try {
        const rules = JSON.parse(p.recommendation.rulesJson) as {
          suggestedPriceCents: number;
          fallbackLevel?: string | null;
        };
        suggestedPrice = rules.suggestedPriceCents ?? null;
        isFallback = rules.fallbackLevel != null;
      } catch {
        console.error(`[products] Failed to parse rulesJson for product ${p.id}`);
        recommendedAction = null;
      }
    }
    return {
      id: p.id,
      title: p.title,
      sku: p.sku,
      currentPrice: p.currentPrice,
      cogs: p.cogs,
      category: p.category,
      estUnits: p.estUnits,
      imageUrl: p.imageUrl,
      margin: marginPct(p.currentPrice, p.cogs),
      modelHealth: p.elasticityModel
        ? {
            r2: p.elasticityModel.r2,
            dataPoints: p.elasticityModel.dataPoints,
            confidenceScore: p.elasticityModel.confidenceScore,
          }
        : null,
      // A fallback-sourced recommendation has no ElasticityModel row at all —
      // this flag lets the UI render "Estimated" instead of "No model" next
      // to an otherwise-actionable suggested price.
      isFallback,
      recommendedAction,
      suggestedPrice,
    };
  });

  return NextResponse.json(rows);
});
