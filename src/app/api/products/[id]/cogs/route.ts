import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
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

    const existing = await prisma.product.findUnique({ where: { id }, select: { cogs: true } });
    const prior = existing?.cogs ?? null;

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { cogs } }),
      ...(cogs !== null && cogs !== prior
        ? [
            prisma.cogsChange.create({
              data: { productId: id, merchantId, fromCents: prior, toCents: cogs, source: "manual_edit" },
            }),
          ]
        : []),
      prisma.recommendation.deleteMany({ where: { productId: id } }),
    ]);

    return NextResponse.json({ ok: true });
  },
);
