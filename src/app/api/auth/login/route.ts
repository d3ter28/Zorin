import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, clearRateLimit } from "@/lib/auth/rateLimit";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";

// Constant-time sentinel: keeps response time equal whether the email exists or not.
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const POST = withErrorHandling(async (req: Request) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterMs } = await checkRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    throw new HttpError(
      429,
      `Too many login attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
    );
  }

  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email === "" || password === "") throw new HttpError(400, "Email and password are required");

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run verifyPassword to equalize timing — no email-existence oracle via latency.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    throw new HttpError(401, "Invalid credentials");
  }

  // Successful login — clear the rate limit bucket for this IP.
  clearRateLimit(ip);

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token, expiresAt);
  return res;
});
