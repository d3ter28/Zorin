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
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/billing/reactivate?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
});
