import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { createPasswordResetToken } from "@/lib/auth/resetToken";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";

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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Always the same response shape regardless of whether the email exists —
  // no account-enumeration oracle, same principle as the login route.
  if (email !== "") {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createPasswordResetToken(prisma, user.id);
      const origin = new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
  }

  return NextResponse.json({ ok: true });
});
