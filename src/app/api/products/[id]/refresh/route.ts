import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { refreshProduct } from "@/lib/scrape/refreshProduct";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Not found");

    const summary = await refreshProduct(prisma, id);
    return NextResponse.json(summary);
  },
);
