import type { PrismaClient } from "@prisma/client";

export interface CampaignConflict {
  productId: string;
  productTitle: string;
  existingCampaignId: string;
  existingCampaignName: string;
}

export async function findConflicts(
  prisma: PrismaClient,
  merchantId: string,
  campaignId: string,
  productIds: string[],
): Promise<CampaignConflict[]> {
  if (productIds.length === 0) return [];

  const overlapping = await prisma.campaignProduct.findMany({
    where: {
      productId: { in: productIds },
      campaign: {
        merchantId,
        id: { not: campaignId },
        status: { in: ["scheduled", "executing", "active"] },
      },
    },
    select: {
      productId: true,
      product: { select: { title: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return overlapping.map((cp) => ({
    productId: cp.productId,
    productTitle: cp.product.title,
    existingCampaignId: cp.campaign.id,
    existingCampaignName: cp.campaign.name,
  }));
}
