import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);

    const body = await parseJsonBody(req);
    const newPrice = body.price;

    if (typeof newPrice !== "number" || !Number.isFinite(newPrice) || newPrice <= 0) {
      throw new HttpError(400, "Price must be a positive number (in cents)");
    }

    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    const fromCents = product.currentPrice;

    if (newPrice === fromCents) {
      throw new HttpError(400, "New price is the same as the current price");
    }

    if (product.shopifyVariantId) {
      try {
        await pushPriceToShopify(merchantId, product.shopifyVariantId, newPrice);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(502, `Shopify sync failed: ${msg}`);
      }
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { currentPrice: newPrice } }),
      prisma.priceChange.create({
        data: { productId: id, fromCents, toCents: newPrice },
      }),
      prisma.recommendation.deleteMany({ where: { productId: id } }),
    ]);

    return NextResponse.json({ ok: true });
  },
);
