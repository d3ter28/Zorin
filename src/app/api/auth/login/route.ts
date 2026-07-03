import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

// Constant-time sentinel: keeps response time equal whether the email exists or not.
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email === "" || password === "") throw new HttpError(400, "Email and password are required");

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run verifyPassword to equalize timing — no email-existence oracle via latency.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    throw new HttpError(401, "invalid credentials");
  }

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token, expiresAt);
  return res;
});
