import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "../signup/route";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email === "" || password === "") throw new HttpError(400, "Email and password are required");

  // Same 401 body for unknown email and wrong password — no existence leak.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "invalid credentials");
  }

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token, expiresAt);
  return res;
});
