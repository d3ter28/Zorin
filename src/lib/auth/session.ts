import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = "zorin_session";

export interface SessionUser {
  id: string;
  email: string;
  merchantId: string;
}

export async function createSession(
  prisma: PrismaClient,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // Prune expired sessions for this user before creating a new one.
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

// Null on missing or expired token; expired rows are deleted lazily here.
export async function getSessionUser(
  prisma: PrismaClient,
  token: string,
): Promise<SessionUser | null> {
  if (!token?.trim()) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }
  const { id, email, merchantId } = session.user;
  return { id, email, merchantId };
}

export async function destroySession(prisma: PrismaClient, token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export async function destroyAllSessions(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function destroyOtherSessions(
  prisma: PrismaClient,
  userId: string,
  keepToken: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId, token: { not: keepToken } } });
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
}
