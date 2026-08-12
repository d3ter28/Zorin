import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";

// 404 (never 403) on foreign or missing campaigns — no existence leak.
export async function assertCampaignOwned(
  prisma: PrismaClient,
  campaignId: string,
  merchantId: string,
): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { merchantId: true },
  });
  if (!campaign || campaign.merchantId !== merchantId) {
    throw new HttpError(404, "Not found");
  }
}
