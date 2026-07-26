import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();
  await prisma.wooCommerceConnection.delete({
    where: { merchantId },
  });
  await prisma.product.updateMany({
    where: { merchantId },
    data: { woocommerceVariantId: null, woocommerceParentId: null },
  });
  return NextResponse.json({ ok: true });
});
