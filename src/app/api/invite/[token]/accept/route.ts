import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { findValidInvitation, markInvitationAccepted } from "@/lib/team/invitation";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const invitation = await findValidInvitation(prisma, token);
    if (!invitation) throw new HttpError(404, "This invite link is invalid or has expired");

    const body = await parseJsonBody(req);
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

    // Re-check at accept time — the invite may have sat in an inbox long
    // enough for the same email to sign up independently in the meantime.
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) throw new HttpError(409, "An account with this email already exists");

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          merchantId: invitation.merchantId,
          role: "MEMBER",
        },
      });
      await markInvitationAccepted(tx, invitation.id);
      return created;
    });

    const { token: sessionToken, expiresAt } = await createSession(prisma, user.id);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, sessionToken, expiresAt);
    return res;
  },
);
