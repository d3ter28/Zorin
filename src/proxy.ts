import { NextRequest, NextResponse } from "next/server";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/early-access",
  "/api/webhooks/stripe",
]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!STATE_CHANGING.has(req.method)) return NextResponse.next();
  if (CSRF_EXEMPT.has(pathname)) return NextResponse.next();

  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.next();

  const host = req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (originHost !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
