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

    await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "draft", executionCursor: 0 },
    });

    await prisma.campaignLog.create({
      data: { campaignId: id, event: "stopped", detail: JSON.stringify({ reason: "cancelled" }) },
    });

    return NextResponse.json(updated);
  },
);
