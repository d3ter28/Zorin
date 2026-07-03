import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const storeName = typeof body.storeName === "string" ? body.storeName.trim() : "";
  const storeUrl = typeof body.storeUrl === "string" ? body.storeUrl.trim() : "";

  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Invalid email address");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
  if (storeName === "") throw new HttpError(400, "Store name is required");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const merchant = await tx.merchant.create({ data: { name: storeName, storeUrl } });
    return tx.user.create({ data: { email, passwordHash, merchantId: merchant.id } });
  });

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
});
