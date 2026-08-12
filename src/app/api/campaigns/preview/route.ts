import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { calculateTargetPrice, type CampaignRules } from "@/lib/campaigns/rules";
import { marginPct } from "@/lib/margin";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);

  const productIds = body.productIds;
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new HttpError(400, "productIds must be a non-empty array");
  }

  const rules = body.rules as CampaignRules;
  if (!rules || typeof rules !== "object" || !rules.mode) {
    throw new HttpError(400, "rules with a mode are required");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds as string[] }, merchantId },
    include: { recommendation: true, competitorPrices: true },
  });

  let changing = 0;
  let skipped = 0;
  let clampedByMarginFloor = 0;
  let totalChangePct = 0;
  const skipReasons: Record<string, number> = {};

  const previewProducts = products.map((p) => {
    const result = calculateTargetPrice(
      {
        currentPrice: p.currentPrice,
        cogs: p.cogs,
        recommendation: p.recommendation,
        competitorPrices: p.competitorPrices,
      },
      rules,
    );

    if (result.skipped) {
      skipped++;
      if (result.skipReason) {
        skipReasons[result.skipReason] = (skipReasons[result.skipReason] || 0) + 1;
      }
    } else {
      changing++;
      totalChangePct += ((result.targetPriceCents - p.currentPrice) / p.currentPrice) * 100;
    }
    if (result.clampedByMarginFloor) clampedByMarginFloor++;

    return {
      productId: p.id,
      title: p.title,
      sku: p.sku,
      currentPriceCents: p.currentPrice,
      targetPriceCents: result.targetPriceCents,
      changePct: p.currentPrice > 0 ? ((result.targetPriceCents - p.currentPrice) / p.currentPrice) * 100 : 0,
      marginPct: result.skipped ? marginPct(p.currentPrice, p.cogs) : marginPct(result.targetPriceCents, p.cogs),
      skipped: result.skipped,
      skipReason: result.skipReason,
      clampedByMarginFloor: result.clampedByMarginFloor,
    };
  });

  return NextResponse.json({
    totalProducts: products.length,
    changing,
    skipped,
    skipReasons,
    clampedByMarginFloor,
    avgChangePct: changing > 0 ? totalChangePct / changing : 0,
    products: previewProducts,
  });
});
