import { NextRequest } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "./session";
import { prisma } from "@/lib/db";

export interface ApiSession {
  merchant: { id: string };
}

// For API routes that need a Request object: returns a session or a 401 Response.
export async function requireSessionApi(
  req: NextRequest
): Promise<ApiSession | Response> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const user = await getSessionUser(prisma, token);
    if (user) {
      return { merchant: { id: user.merchantId } };
    }
  }
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
