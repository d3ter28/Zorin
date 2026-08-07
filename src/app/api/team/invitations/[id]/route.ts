import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { revokeInvitation } from "@/lib/team/invitation";

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireOwnerApi();
    const { id } = await params;
    await revokeInvitation(prisma, id, session.merchantId);
    return NextResponse.json({ ok: true });
  },
);
