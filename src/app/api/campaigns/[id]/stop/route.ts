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
    if (campaign.status === "draft" || campaign.status === "completed") {
      throw new HttpError(400, "Cannot stop a campaign that is in draft or already completed");
    }

    let nextStatus: string;
    if (campaign.status === "reverting") {
      nextStatus = "completed";
    } else {
      nextStatus = campaign.revertOnEnd ? "reverting" : "completed";
    }
    const data: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "reverting") data.executionCursor = 0;
    if (nextStatus === "completed") data.revertedAt = new Date();

    const updated = await prisma.campaign.update({ where: { id }, data });

    await prisma.campaignLog.create({
      data: {
        campaignId: id,
        event: "stopped",
        detail: JSON.stringify({ nextStatus }),
      },
    });

    return NextResponse.json(updated);
  },
);
