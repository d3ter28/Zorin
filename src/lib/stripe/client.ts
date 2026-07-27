import Stripe from "stripe";

// No globalThis HMR caching here (unlike src/lib/db.ts) — the Stripe SDK is a
// stateless HTTP client wrapper with no pooled connections, so duplicate
// instances across hot-reloads carry no correctness or resource cost.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Missing required env var STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(stripeSecretKey);
