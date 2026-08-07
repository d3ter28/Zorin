import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";
import { createInvitation } from "@/lib/team/invitation";
import { sendInviteEmail } from "@/lib/email/sendInviteEmail";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireOwnerApi();
  const body = await parseJsonBody(req);
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(rawEmail)) throw new HttpError(400, "Invalid email address");
  const email = normalizeEmail(rawEmail);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new HttpError(409, "This email already has a Zorin account");

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.merchantId },
    select: { name: true },
  });

  const { token } = await createInvitation(prisma, {
    merchantId: session.merchantId,
    email,
    invitedByUserId: session.user.id,
  });

  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/invite/${token}`;
  sendInviteEmail(email, merchant?.name ?? "your team", inviteUrl).catch((err) => {
    console.error("[team/invite] failed to send invite email:", err);
  });

  return NextResponse.json({ ok: true });
});
