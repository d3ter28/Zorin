import { randomBytes, createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Deletes any existing token for the user first, so only one is ever valid
// at a time. Returns the raw token — only the caller (the email) ever sees
// it; the DB stores just its hash.
export async function createPasswordResetToken(
  prisma: PrismaClient,
  userId: string,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({ data: { tokenHash, userId, expiresAt } });

  return token;
}

// Single-use: the row is deleted whether the token is valid or expired.
// Returns null for both "not found" and "expired" — callers must not
// distinguish between the two in any user-facing message.
export async function consumePasswordResetToken(
  prisma: PrismaClient,
  rawToken: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return null;

  await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });

  if (record.expiresAt.getTime() <= Date.now()) return null;
  return { userId: record.userId };
}
