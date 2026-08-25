import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { withErrorHandling } from "@/lib/api/errors";
import { marginPct } from "@/lib/margin";
import { simulateProfit } from "@/lib/elasticity/simulateProfit";

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const products = await prisma.product.findMany({
    where: { merchantId },
    include: {
      elasticityModel: true,
      recommendation: true,
      priceChanges: { take: 1 },
    },
  });

  const totalProducts = products.length;

  const margins = products
    .map((p) => marginPct(p.currentPrice, p.cogs))
    .filter((m): m is number => m !== null);
  const avgMargin = margins.length > 0
    ? margins.reduce((a, b) => a + b, 0) / margins.length
    : null;

  let modelsStrong = 0;
  let modelsFair = 0;
  let modelsWeak = 0;
  let modelsEstimated = 0;
  let modelsNone = 0;

  for (const p of products) {
    const m = p.elasticityModel;
    if (m) {
      if (m.r2 >= 0.7 && m.dataPoints >= 30) modelsStrong++;
      else if (m.r2 >= 0.5 && m.dataPoints >= 10) modelsFair++;
      else modelsWeak++;
      continue;
    }
    // No real per-SKU model — a fallback-sourced recommendation still counts as
    // "Estimated", not "No model", so it doesn't read as un-actionable in the summary.
    if (p.recommendation) {
      try {
        const rules = JSON.parse(p.recommendation.rulesJson) as { fallbackLevel?: string | null };
        if (rules.fallbackLevel != null) { modelsEstimated++; continue; }
      } catch {
        // Unparseable rulesJson — fall through and count as "none" below.
      }
    }
    modelsNone++;
  }

  let actionsRaise = 0;
  let actionsLower = 0;
  let actionsHold = 0;
  let totalLiftPct = 0;
  let liftCount = 0;

  for (const p of products) {
    const rec = p.recommendation;
    if (!rec) { actionsHold++; continue; }
    if (rec.action === "raise") actionsRaise++;
    else if (rec.action === "lower") actionsLower++;
    else actionsHold++;

    try {
      const rules = JSON.parse(rec.rulesJson);
      if (typeof rules.expectedProfitLiftPct === "number") {
        totalLiftPct += rules.expectedProfitLiftPct;
        liftCount++;
      }
    } catch (e) {
      console.warn("portfolio: failed to parse rulesJson for recommendation", e);
    }
  }

  const avgProfitLiftPct = liftCount > 0 ? totalLiftPct / liftCount : null;

  const FLOOR = 0.15;
  const belowFloor = products.filter((p) => {
    const m = marginPct(p.currentPrice, p.cogs);
    return m !== null && m < FLOOR;
  }).length;

  const hasModels = products.some((p) => p.elasticityModel !== null);
  const hasAppliedPrice = products.some((p) => p.priceChanges.length > 0);

  let profitOpportunityCents = 0;
  for (const p of products) {
    if (!p.recommendation || p.cogs === null) continue;
    if (p.recommendation.action === "hold") continue;

    let rules: { expectedProfitLiftPct?: number; currentProfitCents?: number; fallbackLevel?: string | null };
    try {
      rules = JSON.parse(p.recommendation.rulesJson);
    } catch {
      console.warn("portfolio: failed to parse rulesJson for opportunity calc", p.id);
      continue;
    }
    if (typeof rules.expectedProfitLiftPct !== "number") continue;

    if (p.elasticityModel) {
      const sim = simulateProfit({
        elasticity: p.elasticityModel.elasticity,
        intercept: p.elasticityModel.intercept,
        currentPriceCents: p.currentPrice,
        candidatePriceCents: p.currentPrice,
        cogsCents: p.cogs,
      });
      if (sim.predictedGrossProfitCents <= 0) continue;
      profitOpportunityCents += sim.predictedGrossProfitCents * rules.expectedProfitLiftPct;
      continue;
    }

    // No real ElasticityModel to re-simulate from — only fallback-sourced
    // recommendations count here (a product with neither a model nor a
    // fallback rec has nothing to base an opportunity estimate on). Uses the
    // currentProfitCents already persisted in rulesJson at generation time,
    // since there's no live elasticity/intercept to recompute against
    // today's price/cogs the way the real-model branch above does.
    if (rules.fallbackLevel == null) continue;
    if (typeof rules.currentProfitCents !== "number" || rules.currentProfitCents <= 0) continue;
    profitOpportunityCents += rules.currentProfitCents * rules.expectedProfitLiftPct;
  }

  return NextResponse.json({
    totalProducts,
    avgMargin,
    avgProfitLiftPct,
    belowFloor,
    modelHealth: { strong: modelsStrong, fair: modelsFair, weak: modelsWeak, estimated: modelsEstimated, none: modelsNone },
    actions: { raise: actionsRaise, lower: actionsLower, hold: actionsHold },
    hasModels,
    hasAppliedPrice,
    profitOpportunityCents,
  });
});
