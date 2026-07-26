import { NextRequest, NextResponse } from "next/server";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Public endpoints that don't require CSRF protection (no session cookie).
const CSRF_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/early-access",
]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (!STATE_CHANGING.has(req.method)) return NextResponse.next();
  if (CSRF_EXEMPT.has(pathname)) return NextResponse.next();

  const origin = req.headers.get("origin");

  // No Origin header → same-origin browser request or non-browser client (curl, SDK).
  // Allow it through — attackers cannot suppress the Origin header in browser fetch.
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
