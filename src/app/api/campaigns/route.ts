import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling, HttpError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi, requireOwnerApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  const VALID_STATUSES = ["draft", "scheduled", "executing", "active", "reverting", "completed"];
  if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
    throw new HttpError(400, `Invalid status filter. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const where: Record<string, unknown> = { merchantId };
  if (statusFilter) where.status = statusFilter;

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json(campaigns);
});

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireOwnerApi();
  const body = await parseJsonBody(req);

  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new HttpError(400, "Campaign name is required");
  }

  const type = body.type;
  if (type !== "sale" && type !== "ml_recommendation") {
    throw new HttpError(400, "Campaign type must be 'sale' or 'ml_recommendation'");
  }

  const rules = body.rules;
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    throw new HttpError(400, "Campaign rules must be an object");
  }

  const revertOnEnd =
    body.revertOnEnd !== undefined ? Boolean(body.revertOnEnd) : type === "sale";

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        merchantId,
        name: name.trim(),
        type,
        status: "draft",
        rules: JSON.stringify(rules),
        revertOnEnd,
        startsAt: body.startsAt ? new Date(body.startsAt as string) : null,
        endsAt: body.endsAt ? new Date(body.endsAt as string) : null,
      },
    });

    await tx.campaignLog.create({
      data: { campaignId: created.id, event: "created" },
    });

    return created;
  });

  return NextResponse.json(campaign, { status: 201 });
});
