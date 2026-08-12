import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi, requireOwnerApi } from "@/lib/auth/requireSession";
import { assertCampaignOwned } from "@/lib/campaigns/assertions";

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: {
        products: {
          include: { product: { select: { title: true, sku: true } } },
          orderBy: { id: "asc" },
        },
        logs: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(campaign);
  },
);

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "draft") {
      throw new HttpError(400, "Only draft campaigns can be updated");
    }

    const body = await parseJsonBody(req);
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (trimmed.length === 0) throw new HttpError(400, "Campaign name cannot be empty");
      data.name = trimmed;
    }
    if (body.rules !== undefined) {
      if (!body.rules || typeof body.rules !== "object" || Array.isArray(body.rules)) {
        throw new HttpError(400, "Campaign rules must be an object");
      }
      const mfp = (body.rules as Record<string, unknown>).marginFloorPct;
      if (mfp !== undefined && (typeof mfp !== "number" || mfp >= 100)) {
        throw new HttpError(400, "marginFloorPct must be less than 100");
      }
      data.rules = JSON.stringify(body.rules);
    }
    if (body.revertOnEnd !== undefined) data.revertOnEnd = Boolean(body.revertOnEnd);
    if (body.startsAt !== undefined) {
      if (body.startsAt && isNaN(new Date(body.startsAt as string).getTime())) {
        throw new HttpError(400, "Invalid date format for startsAt/endsAt");
      }
      data.startsAt = body.startsAt ? new Date(body.startsAt as string) : null;
    }
    if (body.endsAt !== undefined) {
      if (body.endsAt && isNaN(new Date(body.endsAt as string).getTime())) {
        throw new HttpError(400, "Invalid date format for startsAt/endsAt");
      }
      data.endsAt = body.endsAt ? new Date(body.endsAt as string) : null;
    }
    if (body.startsAt !== undefined && body.endsAt !== undefined && body.startsAt && body.endsAt) {
      if (!(new Date(body.endsAt as string) > new Date(body.startsAt as string))) {
        throw new HttpError(400, "endsAt must be after startsAt");
      }
    }

    const updated = await prisma.campaign.update({ where: { id }, data });
    return NextResponse.json(updated);
  },
);

export const DELETE = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireOwnerApi();
    const { id } = await params;
    await assertCampaignOwned(prisma, id, merchantId);

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    if (campaign.status !== "draft") {
      throw new HttpError(400, "Only draft campaigns can be deleted");
    }

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
);
