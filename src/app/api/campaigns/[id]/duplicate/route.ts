import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: { products: { select: { productId: true } } },
    });
    if (campaign.status !== "completed") {
      throw new HttpError(400, "Only completed campaigns can be duplicated");
    }

    const productIds = campaign.products.map((p) => p.productId);

    const duplicate = await prisma.campaign.create({
      data: {
        merchantId,
        name: `${campaign.name} (copy)`,
        type: campaign.type,
        status: "draft",
        rules: campaign.rules,
        revertOnEnd: campaign.revertOnEnd,
      },
    });

    await prisma.campaignLog.create({
      data: {
        campaignId: duplicate.id,
        event: "created",
        detail: JSON.stringify({ duplicatedFrom: id, productIds }),
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  },
);
