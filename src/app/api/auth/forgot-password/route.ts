import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { createPasswordResetToken } from "@/lib/auth/resetToken";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";

export const POST = withErrorHandling(async (req: Request) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterMs } = await checkRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`);
  }

  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  // Always the same response shape ({ ok: true }) regardless of whether the
  // email exists — an attacker inspecting the response body can't tell which
  // case occurred. Note this is weaker than login's protection: login also
  // equalizes response TIMING (always running verifyPassword against a real
  // or dummy hash), but this route does extra work (token creation + email
  // dispatch) only for known emails, so response latency here could still
  // leak account existence to a sufficiently precise timing attack. Rate
  // limiting bounds how many times an attacker can probe this at all, which
  // mitigates but doesn't eliminate that gap.
  if (email !== "") {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createPasswordResetToken(prisma, user.id);
      const origin = new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;
      sendPasswordResetEmail(email, resetUrl).catch((err) => {
        console.error("Failed to send password reset email:", err);
      });
    }
  }

  return NextResponse.json({ ok: true });
});
