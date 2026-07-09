import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  await prisma.shopifyConnection.delete({
    where: { merchantId },
  });

  return NextResponse.json({ success: true });
});
