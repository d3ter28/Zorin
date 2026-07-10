import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";
import { detectPromotions } from "@/lib/elasticity/detectPromotions";

/**
 * POST — auto-detect promotional outliers and write promotionFlag to each record.
 * Requires a fitted ElasticityModel to compute residuals against.
 * Returns { flagged: number, cleared: number }.
 */
export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);

    const model = await prisma.elasticityModel.findUnique({ where: { productId: id } });
    if (!model) throw new HttpError(400, "No elasticity model fitted yet — fit the model first");

    const records = await prisma.salesRecord.findMany({
      where: { productId: id },
      select: { id: true, priceCents: true, unitsSold: true },
    });

    const flaggedIds = detectPromotions(records, model);

    const [flagged, cleared] = await Promise.all([
      prisma.salesRecord.updateMany({
        where: { productId: id, id: { in: [...flaggedIds] } },
        data: { promotionFlag: true },
      }),
      prisma.salesRecord.updateMany({
        where: { productId: id, id: { notIn: [...flaggedIds] } },
        data: { promotionFlag: false },
      }),
    ]);

    return NextResponse.json({ flagged: flagged.count, cleared: cleared.count });
  },
);

/**
 * PATCH — manually toggle promotionFlag on a single sales record.
 * Body: { recordId: string, flagged: boolean }
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);

    const body = await req.json();
    const { recordId, flagged } = body;
    if (typeof recordId !== "string" || typeof flagged !== "boolean") {
      throw new HttpError(400, "recordId (string) and flagged (boolean) are required");
    }

    const record = await prisma.salesRecord.findFirst({
      where: { id: recordId, productId: id },
    });
    if (!record) throw new HttpError(404, "Record not found");

    await prisma.salesRecord.update({
      where: { id: recordId },
      data: { promotionFlag: flagged },
    });

    return NextResponse.json({ ok: true });
  },
);
