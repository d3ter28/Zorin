import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseCogs, parseJsonBody } from "@/lib/api/validation";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await parseJsonBody(req);
    const cogs = parseCogs(body.cogs);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new HttpError(404, "Not found");
    }

    await prisma.product.update({ where: { id }, data: { cogs } });
    // Invalidate cached recommendation.
    await prisma.recommendation.deleteMany({ where: { productId: id } });

    return NextResponse.json({ ok: true });
  },
);
