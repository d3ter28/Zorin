import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";
import { findConflicts } from "@/lib/campaigns/conflicts";
import { calculateTargetPrice, type CampaignRules } from "@/lib/campaigns/rules";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "draft") {
      throw new HttpError(400, "Only draft campaigns can be scheduled");
    }
    if (!campaign.startsAt) {
      throw new HttpError(400, "startsAt must be set before scheduling");
    }

    const body = await parseJsonBody(req);
    const productIds = body.productIds;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new HttpError(400, "productIds must be a non-empty array");
    }

    const conflicts = await findConflicts(prisma, merchantId, id, productIds as string[]);
    if (conflicts.length > 0 && !body.overrideConflicts) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds as string[] }, merchantId },
      include: {
        recommendation: true,
        competitorPrices: true,
      },
    });

    const rules: CampaignRules = JSON.parse(campaign.rules);
    const campaignProducts: Array<{
      campaignId: string;
      productId: string;
      originalPriceCents: number;
      targetPriceCents: number;
    }> = [];

    for (const product of products) {
      const result = calculateTargetPrice(
        {
          currentPrice: product.currentPrice,
          cogs: product.cogs,
          recommendation: product.recommendation,
          competitorPrices: product.competitorPrices,
        },
        rules,
      );
      if (!result.skipped) {
        campaignProducts.push({
          campaignId: id,
          productId: product.id,
          originalPriceCents: product.currentPrice,
          targetPriceCents: result.targetPriceCents,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (conflicts.length > 0 && body.overrideConflicts) {
        const conflictProductIds = conflicts.map((c) => c.productId);
        const conflictCampaignIds = [...new Set(conflicts.map((c) => c.existingCampaignId))];
        await tx.campaignProduct.deleteMany({
          where: { productId: { in: conflictProductIds }, campaignId: { in: conflictCampaignIds } },
        });
      }

      if (campaignProducts.length > 0) {
        await tx.campaignProduct.createMany({ data: campaignProducts });
      }

      const result = await tx.campaign.update({
        where: { id },
        data: { status: "scheduled" },
      });

      await tx.campaignLog.create({
        data: { campaignId: id, event: "scheduled", detail: JSON.stringify({ productCount: campaignProducts.length }) },
      });

      return result;
    });

    return NextResponse.json(updated);
  },
);
