import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { isValidShopDomain, buildAuthorizeUrl } from "@/lib/shopify/oauth";

const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  };
}

export async function GET(req: NextRequest) {
  // Full-page navigation, not a fetch call — redirects to /login (or
  // /billing/reactivate) rather than a JSON 401, matching how every other
  // top-level settings navigation in this app is gated.
  await requireSessionPage();

  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase() ?? "";

  if (!isValidShopDomain(shop)) {
    const url = new URL("/settings/integrations", req.url);
    url.searchParams.set("shopify_error", "Enter a valid *.myshopify.com domain.");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeUrl(shop, state));
  res.cookies.set("shopify_oauth_state", state, cookieOptions());
  res.cookies.set("shopify_oauth_shop", shop, cookieOptions());
  return res;
}
