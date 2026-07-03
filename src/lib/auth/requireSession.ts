import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "./session";

export interface SessionInfo {
  user: SessionUser;
  merchantId: string;
}

export async function getSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await getSessionUser(prisma, token);
  if (!user) return null;
  return { user, merchantId: user.merchantId };
}

// For API routes: withErrorHandling converts the throw into a 401 JSON response.
export async function requireSessionApi(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "unauthorized");
  return session;
}

// For server components: unauthenticated visitors land on the login page.
export async function requireSessionPage(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
