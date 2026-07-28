import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { destroyOtherSessions, SESSION_COOKIE } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export const POST = withErrorHandling(async (req: Request) => {
  // Defense-in-depth: this route is already gated behind a valid session
  // (a much stronger barrier than the anonymous forgot/reset-password
  // routes), but rate limiting still bounds how many current-password
  // guesses an attacker gets if they've obtained a live session cookie
  // (e.g. via XSS) without the actual account password. Checked first,
  // before session/body work, matching every other auth route's ordering.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const { allowed, retryAfterMs } = await checkRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`);
  }

  const { user } = await requireSessionApi();

  const body = await parseJsonBody(req);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new HttpError(401, "unauthorized");

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) throw new HttpError(401, "Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const store = await cookies();
  // requireSessionApi() above already confirmed this cookie is present and
  // valid, so this should never actually be empty — the fallback exists so
  // that if it somehow were, destroyOtherSessions never matches any real
  // token and safely destroys every session (fail-safe toward more
  // invalidation, not less) rather than crashing.
  const currentToken = store.get(SESSION_COOKIE)?.value ?? "";
  await destroyOtherSessions(prisma, user.id, currentToken);

  return NextResponse.json({ ok: true });
});
