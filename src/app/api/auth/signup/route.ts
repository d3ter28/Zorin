import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { isValidPlanTier } from "@/lib/stripe/plans";
import { TRIAL_DAYS } from "@/lib/billing/trial";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";
import { notifySignup } from "@/lib/email/notifySignup";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const DEFAULT_PLAN_TIER = "growth";

export const POST = withErrorHandling(async (req: Request) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterMs } = await checkRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`);
  }

  const body = await parseJsonBody(req);
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const storeName = typeof body.storeName === "string" ? body.storeName.trim() : "";
  const storeUrl = typeof body.storeUrl === "string" ? body.storeUrl.trim() : "";
  const rawPlan = typeof body.plan === "string" ? body.plan : "";
  const plan = rawPlan === "" ? DEFAULT_PLAN_TIER : rawPlan;

  if (!EMAIL_RE.test(rawEmail)) throw new HttpError(400, "Invalid email address");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
  if (storeName === "") throw new HttpError(400, "Store name is required");
  if (!isValidPlanTier(plan)) throw new HttpError(400, "plan must be one of starter, growth, scale");

  // Canonicalize before the uniqueness check — otherwise "you@gmail.com" and
  // "you+trial@gmail.com" register as two separate accounts, each getting
  // its own free trial.
  const email = normalizeEmail(rawEmail);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const passwordHash = await hashPassword(password);
  // No Stripe involvement here — the trial starts immediately with no card
  // required. trialEndsAt is what actually gates access (see
  // hasActiveSubscription); Stripe only enters the picture if the merchant
  // converts to a paid plan, either during the trial or after it expires
  // via /billing/reactivate.
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const user = await prisma.$transaction(async (tx) => {
    const merchant = await tx.merchant.create({
      data: { name: storeName, storeUrl, subscriptionStatus: "trialing", planTier: plan, trialEndsAt },
    });
    return tx.user.create({ data: { email, passwordHash, merchantId: merchant.id } });
  });

  notifySignup({ email, storeName, planTier: plan }).catch((err) => {
    console.error("[signup] notification email failed:", err);
  });

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
});
