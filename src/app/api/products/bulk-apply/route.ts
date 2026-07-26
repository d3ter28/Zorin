import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";
import { getWooClient } from "@/lib/woocommerce/getClient";
import { pushPriceToWooCommerce } from "@/lib/woocommerce/pushPrice";
import { centsToDollars } from "@/lib/money";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);

  if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
    throw new HttpError(400, "productIds must be a non-empty array");
  }

  const productIds: string[] = body.productIds;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId },
    include: { recommendation: true },
  });

  let applied = 0;
  let skipped = 0;
  const failed: { id: string; title: string; reason: string }[] = [];
  const woocommerceResults: { productId: string; pushed: boolean; error?: string }[] = [];

  const wooClient = await getWooClient(merchantId);

  for (const p of products) {
    if (!p.recommendation) { skipped++; continue; }

    let suggestedPriceCents: number | null = null;
    try {
      const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents: number };
      suggestedPriceCents = rules.suggestedPriceCents ?? null;
    } catch { skipped++; continue; }

    if (!suggestedPriceCents || suggestedPriceCents === p.currentPrice) { skipped++; continue; }

    if (p.shopifyVariantId) {
      try {
        await pushPriceToShopify(merchantId, p.shopifyVariantId, suggestedPriceCents);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ id: p.id, title: p.title, reason: `Shopify sync failed: ${msg}` });
        continue;
      }
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id: p.id }, data: { currentPrice: suggestedPriceCents } }),
      prisma.priceChange.create({
        data: { productId: p.id, fromCents: p.currentPrice, toCents: suggestedPriceCents },
      }),
      prisma.recommendation.deleteMany({ where: { productId: p.id } }),
    ]);
    applied++;

    if (p.woocommerceVariantId && wooClient) {
      const result = await pushPriceToWooCommerce(prisma, wooClient, p.id, centsToDollars(suggestedPriceCents));
      woocommerceResults.push({ productId: p.id, pushed: result.ok, ...(result.error && { error: result.error }) });
    }
  }

  return NextResponse.json({ applied, skipped, failed, woocommerceResults });
});
