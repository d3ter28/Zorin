import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { destroyOtherSessions, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = withErrorHandling(async (req: Request) => {
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
  const currentToken = store.get(SESSION_COOKIE)?.value ?? "";
  await destroyOtherSessions(prisma, user.id, currentToken);

  return NextResponse.json({ ok: true });
});
