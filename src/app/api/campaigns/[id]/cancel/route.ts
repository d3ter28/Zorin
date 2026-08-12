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

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "scheduled") {
      throw new HttpError(400, "Only scheduled campaigns can be cancelled");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.campaignProduct.deleteMany({ where: { campaignId: id } });
      const result = await tx.campaign.update({
        where: { id },
        data: { status: "draft", executionCursor: 0 },
      });
      await tx.campaignLog.create({
        data: { campaignId: id, event: "stopped", detail: JSON.stringify({ reason: "cancelled" }) },
      });
      return result;
    });

    return NextResponse.json(updated);
  },
);
