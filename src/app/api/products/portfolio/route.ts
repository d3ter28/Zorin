import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { withErrorHandling } from "@/lib/api/errors";
import { marginPct } from "@/lib/margin";

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
  let modelsNone = 0;

  for (const p of products) {
    const m = p.elasticityModel;
    if (!m) { modelsNone++; continue; }
    if (m.r2 >= 0.7 && m.dataPoints >= 30) modelsStrong++;
    else if (m.r2 >= 0.5 && m.dataPoints >= 10) modelsFair++;
    else modelsWeak++;
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

  return NextResponse.json({
    totalProducts,
    avgMargin,
    avgProfitLiftPct,
    belowFloor,
    modelHealth: { strong: modelsStrong, fair: modelsFair, weak: modelsWeak, none: modelsNone },
    actions: { raise: actionsRaise, lower: actionsLower, hold: actionsHold },
    hasModels,
    hasAppliedPrice,
  });
});
