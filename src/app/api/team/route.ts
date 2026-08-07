import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { listTeam } from "@/lib/team/invitation";

export const GET = withErrorHandling(async () => {
  const session = await requireSessionApi();
  const team = await listTeam(prisma, session.merchantId);

  return NextResponse.json({
    members: team.members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    pendingInvites: team.pendingInvites.map((i) => ({
      ...i,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
});
