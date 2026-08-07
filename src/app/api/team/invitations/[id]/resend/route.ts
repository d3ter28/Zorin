import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { createInvitation } from "@/lib/team/invitation";
import { sendInviteEmail } from "@/lib/email/sendInviteEmail";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireOwnerApi();
    const { id } = await params;

    const existing = await prisma.invitation.findFirst({
      where: { id, merchantId: session.merchantId, acceptedAt: null },
    });
    if (!existing) throw new HttpError(404, "Not found");

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: { name: true },
    });

    // createInvitation deletes any existing pending row for this
    // (merchantId, email) first — so this call alone both revokes the old
    // token and issues a fresh one.
    const { token } = await createInvitation(prisma, {
      merchantId: session.merchantId,
      email: existing.email,
      invitedByUserId: session.user.id,
    });

    const origin = new URL(req.url).origin;
    const inviteUrl = `${origin}/invite/${token}`;
    sendInviteEmail(existing.email, merchant?.name ?? "your team", inviteUrl).catch((err) => {
      console.error("[team/invitations/resend] failed to send invite email:", err);
    });

    return NextResponse.json({ ok: true });
  },
);
