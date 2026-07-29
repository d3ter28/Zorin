import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { isValidPlanTier, tierForPriceId } from "@/lib/stripe/plans";

export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      // No trialing/trialEndsAt written here — Checkout no longer grants a
      // Stripe-side trial (see /api/billing/checkout), so the subscription
      // is active (or incomplete, on payment failure) immediately. The
      // customer.subscription.updated event below fires right after this
      // one and sets the real status read straight from Stripe, rather than
      // this event guessing at it.
      //
      // planTier round-trips via the metadata set when the session was
      // created (see /api/billing/checkout) — the session itself carries no
      // price info without an extra Stripe API call.
      const metadataPlanTier = session.metadata?.planTier;
      const planTier =
        typeof metadataPlanTier === "string" && isValidPlanTier(metadataPlanTier)
          ? metadataPlanTier
          : null;
      await prisma.merchant.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscriptionId,
          ...(planTier ? { planTier } : {}),
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      // Unlike checkout.session.completed above, this event carries the
      // subscription's line items directly, so planTier is derived from the
      // price ID here rather than from metadata.
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id;
      const planTier = tierForPriceId(priceId);
      await prisma.merchant.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: subscription.status,
          ...(planTier ? { planTier } : {}),
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await prisma.merchant.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: "canceled" },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
