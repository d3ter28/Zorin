import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";
import { executeChunk } from "@/lib/campaigns/execute";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "scheduled") {
      throw new HttpError(400, "Only scheduled campaigns can be manually executed");
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "executing", startsAt: new Date(), executionCursor: 0 },
    });

    await prisma.campaignLog.create({
      data: { campaignId: id, event: "execution_started" },
    });

    const result = await executeChunk(prisma, id, merchantId, 0);

    if (result.done) {
      await prisma.campaign.update({
        where: { id },
        data: { status: "active", executedAt: new Date() },
      });
      await prisma.campaignLog.create({
        data: { campaignId: id, event: "execution_completed" },
      });
    }

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(updated);
  },
);
