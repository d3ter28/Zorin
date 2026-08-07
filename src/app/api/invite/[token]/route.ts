import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { findValidInvitation } from "@/lib/team/invitation";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const invitation = await findValidInvitation(prisma, token);
    if (!invitation) throw new HttpError(404, "This invite link is invalid or has expired");

    const merchant = await prisma.merchant.findUnique({
      where: { id: invitation.merchantId },
      select: { name: true },
    });

    return NextResponse.json({ merchantName: merchant?.name ?? "", email: invitation.email });
  },
);
