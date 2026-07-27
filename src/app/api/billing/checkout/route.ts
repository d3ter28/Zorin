import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { isValidPlanTier, priceIdForTier } from "@/lib/stripe/plans";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId, user } = await requireSessionApi();

  const body = (await req.json()) as { plan?: unknown };
  if (typeof body.plan !== "string" || !isValidPlanTier(body.plan)) {
    throw new HttpError(400, "plan must be one of starter, growth, scale");
  }
  const plan = body.plan;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, stripeCustomerId: true },
  });
  if (!merchant) throw new HttpError(404, "Merchant not found");

  let customerId = merchant.stripeCustomerId;
  if (!customerId) {
    // Not transactional: if the Prisma write below fails after this Stripe
    // call succeeds, the merchant gets a second Stripe customer on their next
    // checkout attempt (stripeCustomerId is still null). Acceptable risk for
    // now — the webhook handler is the natural place to add reconciliation
    // if this ever shows up as duplicate customers in practice.
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_collection: "always",
    line_items: [{ price: priceIdForTier(plan), quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    // Round-trips through checkout.session.completed so the webhook can set
    // Merchant.planTier without an extra Stripe API call — session.subscription
    // on that event is just a string ID with no price info attached.
    metadata: { planTier: plan },
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/billing/reactivate?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
});
