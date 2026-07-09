import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const GET = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  const connection = await prisma.shopifyConnection.findUnique({
    where: { merchantId },
    select: { shopDomain: true, lastSyncedAt: true },
  });

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    shopDomain: connection.shopDomain,
    lastSyncedAt: connection.lastSyncedAt,
  });
});
