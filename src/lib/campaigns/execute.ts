import type { PrismaClient } from "@prisma/client";
import { pushPriceToShopify } from "@/lib/shopify/pushPrice";
import { getWooClient } from "@/lib/woocommerce/getClient";
import { pushPriceToWooCommerce } from "@/lib/woocommerce/pushPrice";
import { centsToDollars } from "@/lib/money";

const DEFAULT_CHUNK_SIZE = 30;

export interface ChunkResult {
  processed: number;
  done: boolean;
}

export async function executeChunk(
  prisma: PrismaClient,
  campaignId: string,
  merchantId: string,
  cursor: number,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<ChunkResult> {
  const rows = await prisma.campaignProduct.findMany({
    where: { campaignId, appliedAt: null, error: null },
    orderBy: { id: "asc" },
    take: chunkSize,
    include: {
      product: {
        select: {
          id: true,
          shopifyVariantId: true,
          woocommerceVariantId: true,
          currentPrice: true,
        },
      },
    },
  });

  if (rows.length === 0) return { processed: 0, done: true };

  for (const row of rows) {
    try {
      if (row.product.shopifyVariantId) {
        await pushPriceToShopify(merchantId, row.product.shopifyVariantId, row.targetPriceCents);
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: row.productId },
          data: { currentPrice: row.targetPriceCents },
        }),
        prisma.priceChange.create({
          data: {
            productId: row.productId,
            fromCents: row.product.currentPrice,
            toCents: row.targetPriceCents,
          },
        }),
        prisma.campaignProduct.update({
          where: { id: row.id },
          data: { appliedAt: new Date() },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId,
            event: "product_applied",
            detail: JSON.stringify({ productId: row.productId }),
          },
        }),
      ]);

      if (row.product.woocommerceVariantId) {
        const wooClient = await getWooClient(merchantId);
        if (wooClient) {
          const result = await pushPriceToWooCommerce(
            prisma,
            wooClient,
            row.productId,
            centsToDollars(row.targetPriceCents),
          );
          if (!result.ok) {
            await prisma.campaignLog.create({
              data: {
                campaignId,
                event: "product_failed",
                detail: JSON.stringify({
                  productId: row.productId,
                  error: `WooCommerce sync failed: ${result.error}`,
                  priceAppliedInDb: true,
                }),
              },
            });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.campaignProduct.update({
        where: { id: row.id },
        data: { error: msg },
      });
      await prisma.campaignLog.create({
        data: {
          campaignId,
          event: "product_failed",
          detail: JSON.stringify({ productId: row.productId, error: msg }),
        },
      });
    }
  }

  const remaining = await prisma.campaignProduct.count({
    where: { campaignId, appliedAt: null, error: null },
  });

  const newCursor = cursor + rows.length;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { executionCursor: newCursor },
  });

  return { processed: rows.length, done: remaining === 0 };
}

export async function revertChunk(
  prisma: PrismaClient,
  campaignId: string,
  merchantId: string,
  cursor: number,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<ChunkResult> {
  const rows = await prisma.campaignProduct.findMany({
    where: { campaignId, appliedAt: { not: null }, revertedAt: null, error: null },
    orderBy: { id: "asc" },
    take: chunkSize,
    include: {
      product: {
        select: {
          id: true,
          shopifyVariantId: true,
          woocommerceVariantId: true,
          currentPrice: true,
        },
      },
    },
  });

  if (rows.length === 0) return { processed: 0, done: true };

  for (const row of rows) {
    try {
      if (row.product.shopifyVariantId) {
        await pushPriceToShopify(merchantId, row.product.shopifyVariantId, row.originalPriceCents);
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: row.productId },
          data: { currentPrice: row.originalPriceCents },
        }),
        prisma.priceChange.create({
          data: {
            productId: row.productId,
            fromCents: row.product.currentPrice,
            toCents: row.originalPriceCents,
          },
        }),
        prisma.campaignProduct.update({
          where: { id: row.id },
          data: { revertedAt: new Date() },
        }),
        prisma.campaignLog.create({
          data: {
            campaignId,
            event: "product_reverted",
            detail: JSON.stringify({ productId: row.productId }),
          },
        }),
      ]);

      if (row.product.woocommerceVariantId) {
        const wooClient = await getWooClient(merchantId);
        if (wooClient) {
          await pushPriceToWooCommerce(
            prisma,
            wooClient,
            row.productId,
            centsToDollars(row.originalPriceCents),
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.campaignProduct.update({
        where: { id: row.id },
        data: { error: msg },
      });
      await prisma.campaignLog.create({
        data: {
          campaignId,
          event: "product_failed",
          detail: JSON.stringify({ productId: row.productId, error: msg }),
        },
      });
    }
  }

  const remaining = await prisma.campaignProduct.count({
    where: { campaignId, appliedAt: { not: null }, revertedAt: null, error: null },
  });

  const newCursor = cursor + rows.length;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { executionCursor: newCursor },
  });

  return { processed: rows.length, done: remaining === 0 };
}
