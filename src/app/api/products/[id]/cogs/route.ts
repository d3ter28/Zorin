import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseCogs, parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { assertProductOwned } from "@/lib/auth/ownership";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id } = await params;
    await assertProductOwned(prisma, id, merchantId);
    const body = await parseJsonBody(req);
    const cogs = parseCogs(body.cogs);

    await prisma.product.update({ where: { id }, data: { cogs } });
    // Invalidate cached recommendation.
    await prisma.recommendation.deleteMany({ where: { productId: id } });

    return NextResponse.json({ ok: true });
  },
);
