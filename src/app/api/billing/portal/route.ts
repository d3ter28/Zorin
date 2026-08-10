import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireOwnerApi();

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { stripeCustomerId: true },
  });
  if (!merchant?.stripeCustomerId) {
    throw new HttpError(400, "No billing account found for this merchant yet");
  }

  // Requires the Customer Portal to be activated once in the Stripe
  // Dashboard (Settings -> Billing -> Customer Portal) — otherwise this
  // call throws a Stripe API error that surfaces here as an opaque 500.
  const origin = new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
});
