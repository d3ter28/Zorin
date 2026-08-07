import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { destroyAllSessions, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = withErrorHandling(async () => {
  const session = await requireSessionApi();

  if (session.user.role === "OWNER") {
    throw new HttpError(400, "The account owner cannot leave the team");
  }

  await destroyAllSessions(prisma, session.user.id);
  await prisma.user.delete({ where: { id: session.user.id } });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
