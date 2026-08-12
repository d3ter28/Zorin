import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeChunk, revertChunk } from "@/lib/campaigns/execute";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // 1. Scheduled campaigns past their start time → executing
  const scheduledReady = await prisma.campaign.findMany({
    where: { status: "scheduled", startsAt: { lte: now } },
  });

  for (const c of scheduledReady) {
    await prisma.campaign.update({
      where: { id: c.id },
      data: { status: "executing", executionCursor: 0 },
    });
    await prisma.campaignLog.create({
      data: { campaignId: c.id, event: "execution_started" },
    });
  }

  // 2. Executing campaigns → run next chunk
  const executing = await prisma.campaign.findMany({
    where: { status: "executing" },
  });

  for (const c of executing) {
    const result = await executeChunk(prisma, c.id, c.merchantId, c.executionCursor);
    if (result.done) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "active", executedAt: now },
      });
      await prisma.campaignLog.create({
        data: { campaignId: c.id, event: "execution_completed" },
      });
    }
  }

  // 3. Active campaigns past endsAt → reverting or completed
  const activeExpired = await prisma.campaign.findMany({
    where: { status: "active", endsAt: { not: null, lte: now } },
  });

  for (const c of activeExpired) {
    if (c.revertOnEnd) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "reverting", executionCursor: 0 },
      });
      await prisma.campaignLog.create({
        data: { campaignId: c.id, event: "revert_started" },
      });
    } else {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "completed", revertedAt: now },
      });
    }
  }

  // 4. Reverting campaigns → run next revert chunk
  const reverting = await prisma.campaign.findMany({
    where: { status: "reverting" },
  });

  for (const c of reverting) {
    const result = await revertChunk(prisma, c.id, c.merchantId, c.executionCursor);
    if (result.done) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: "completed", revertedAt: now },
      });
      await prisma.campaignLog.create({
        data: { campaignId: c.id, event: "revert_completed" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
