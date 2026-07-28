import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/resetToken";
import { destroyAllSessions } from "@/lib/auth/session";

const GENERIC_TOKEN_ERROR = "This reset link is invalid or has expired";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (token === "") throw new HttpError(400, GENERIC_TOKEN_ERROR);
  if (newPassword.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

  const consumed = await consumePasswordResetToken(prisma, token);
  if (!consumed) throw new HttpError(400, GENERIC_TOKEN_ERROR);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: consumed.userId }, data: { passwordHash } });
  await destroyAllSessions(prisma, consumed.userId);

  return NextResponse.json({ ok: true });
});
