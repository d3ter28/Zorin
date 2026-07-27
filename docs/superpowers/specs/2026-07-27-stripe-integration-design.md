# Stripe Subscription Billing — Design

## Context

Zorin currently has fully open signup — anyone can create an account and use the full product with no payment. This spec adds real subscription billing on top of the 3-tier pricing already live on the marketing page (Starter $39/mo, Growth $99/mo, Scale $249/mo).

## Decisions made during brainstorming

- **Trial model:** 14-day trial, card required at signup (Stripe's `payment_method_collection: "always"` + `trial_period_days: 14`). No charge until day 15.
- **No existing accounts to migrate** — this is a pre-launch product, so there is no grandfathering concern.
- **Signup flow:** account creation stays as-is, then the browser is redirected to Stripe's hosted Checkout page for plan selection confirmation + card entry. No custom card form, no Stripe Elements.
- **Billing management:** Stripe's hosted Customer Portal (not custom-built) for plan changes, card updates, cancellation, invoice history.
- **Gating:** when a merchant has no active/trialing subscription (trial expired without payment, subscription canceled, or payment failed past Stripe's retry window), the dashboard fully locks and redirects to a reactivate screen. No read-only mode.

## Architecture

```
Pricing section (?plan=starter|growth|scale)
        │
        ▼
   /signup (creates account + session, same as today)
        │
        ▼
POST /api/billing/checkout (creates Stripe Checkout Session)
        │
        ▼
  Stripe-hosted Checkout page (card entry, trial starts)
        │
        ▼
  Redirect back to /dashboard?checkout=success
        │
        │  (async, arrives independently of the browser)
        ▼
POST /api/webhooks/stripe  ──▶  updates Merchant.subscriptionStatus
                                  (source of truth for gating)
```

`requireSessionPage` (used by every protected server component) is extended to check `Merchant.subscriptionStatus`. If it isn't `"trialing"` or `"active"`, the request is redirected to `/billing/reactivate` instead of rendering.

The webhook — not the checkout redirect — is the source of truth, because trial expiry, failed payments, and cancellations all happen asynchronously with no browser present to redirect.

## Data model

Add billing fields directly to `Merchant` (already the 1:1 billing entity — one `User` per `Merchant`):

```prisma
model Merchant {
  id                String             @id @default(cuid())
  name              String
  storeUrl          String
  createdAt         DateTime           @default(now())
  stripeCustomerId     String?
  stripeSubscriptionId String?
  subscriptionStatus   String?   // "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid" | null
  planTier             String?   // "starter" | "growth" | "scale"
  trialEndsAt          DateTime?
  products               Product[]
  user                   User?
  shopifyConnection      ShopifyConnection?
  wooCommerceConnection  WooCommerceConnection?
}
```

Applied to both `prisma/schema.prisma` (dev/SQLite) and `prisma/schema.production.prisma` (Postgres) to keep them in sync, per the existing project convention.

**Gating rule (explicit, to remove ambiguity):** access is allowed only when `subscriptionStatus` is `"trialing"` or `"active"`. Every other value — including `"past_due"` — locks the dashboard. This is a stricter interpretation than typical dunning-grace-period practice, but matches the "full lock" decision made during brainstorming; Stripe's Smart Retries will keep attempting the card in the background, and the merchant regains access automatically the moment a retry succeeds and the webhook flips status back to `"active"`.

## Components

### `src/lib/stripe/client.ts`
Singleton Stripe SDK client, reads `STRIPE_SECRET_KEY`. Mirrors the `src/lib/db.ts` singleton pattern already used for Prisma.

### `src/lib/stripe/plans.ts`
Maps plan tier strings to Stripe Price IDs, read from env vars:
```ts
export const PLAN_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  growth: process.env.STRIPE_PRICE_GROWTH!,
  scale: process.env.STRIPE_PRICE_SCALE!,
};
```
Also exports `isValidPlanTier(tier: string): tier is "starter" | "growth" | "scale"`.

### `src/app/api/billing/checkout/route.ts` (POST)
- Requires session (`requireSessionApi`)
- Reads `plan` from JSON body, validates against `PLAN_PRICE_IDS`
- If `Merchant.stripeCustomerId` doesn't exist yet, creates a Stripe Customer (email from session user) and saves the ID
- Creates a Stripe Checkout Session: `mode: "subscription"`, the resolved price ID, `trial_period_days: 14`, `payment_method_collection: "always"`, `success_url` → `/dashboard?checkout=success`, `cancel_url` → `/billing/reactivate?checkout=canceled`
- Returns `{ url: session.url }` for the client to redirect to

### `src/app/api/webhooks/stripe/route.ts` (POST)
- Reads the raw request body (required for signature verification — Next.js route handlers support `req.text()`)
- Verifies signature via `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`; returns 400 on failure
- Handles three event types, all idempotent (safe to process the same event twice — Stripe retries on non-2xx):
  - `checkout.session.completed` → look up `Merchant` by `stripeCustomerId`, set `stripeSubscriptionId`, `planTier` (from the price ID on the session), `subscriptionStatus: "trialing"`, `trialEndsAt`
  - `customer.subscription.updated` → update `subscriptionStatus` and `planTier` to match the subscription's current state (covers trial→active conversion, plan changes via the Customer Portal, and payment failures moving to `past_due`)
  - `customer.subscription.deleted` → set `subscriptionStatus: "canceled"`
- Any other event type is ignored (200 OK, no-op)

### `src/lib/billing/subscriptionGate.ts`
```ts
export const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export function hasActiveSubscription(status: string | null): boolean {
  return status !== null && ACTIVE_STATUSES.has(status);
}
```

### `src/lib/auth/requireSession.ts` (modified)
`requireSessionPage` fetches `Merchant.subscriptionStatus` alongside the session and calls `hasActiveSubscription`. If false, `redirect("/billing/reactivate")` instead of rendering. `requireSessionApi` (used by JSON API routes) is left unchanged — API routes that mutate billable data (e.g. bulk-apply) will get a natural 401/redirect failure path via the page layer instead; this avoids doubling the gate logic across every API route for v1.

### `src/app/billing/reactivate/page.tsx`
Server component. Requires a session (but not an active subscription — this page must be reachable *because* the subscription isn't active). Shows "Your trial has ended" (or "Your subscription needs attention" if canceled/past_due) with a plan picker (reuses the 3-tier card layout from the marketing `Pricing` component) whose buttons POST to `/api/billing/checkout`.

### `src/app/api/billing/portal/route.ts` (POST)
- Requires session
- Creates a Stripe Billing Portal session for `Merchant.stripeCustomerId`, `return_url` → `/settings`
- Returns `{ url: session.url }`

### `src/app/settings/page.tsx` (modified)
Add a "Manage billing" card/button that POSTs to `/api/billing/portal` and redirects to the returned URL. Shows current plan tier and status read from `Merchant`.

### `src/components/marketing/Pricing.tsx` (modified)
Each plan's `href` changes from `/signup` to `/signup?plan=starter` / `?plan=growth` / `?plan=scale`.

### `src/app/signup/page.tsx` + signup form component (modified)
Reads `plan` from the URL search params (defaults to `"growth"` if missing or invalid). After the existing signup POST succeeds (account created, session cookie set), the client calls `POST /api/billing/checkout` with the plan, then `window.location.href = data.url` to redirect to Stripe. No visible plan picker on the signup page itself — the plan was already chosen on the pricing section.

### `src/proxy.ts` (modified)
Add `/api/webhooks/stripe` to `CSRF_EXEMPT`. Stripe's webhook requests carry no `Origin` header so the existing `!origin → next()` branch already lets them through, but this makes the exemption explicit and future-proof rather than relying on an implicit fallthrough.

## Environment variables

Added to `.env.example`:
```
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_STARTER=""
STRIPE_PRICE_GROWTH=""
STRIPE_PRICE_SCALE=""
```

The three Price IDs are created once, manually, in the Stripe Dashboard (Products → Add Product, one per tier, recurring monthly) — no programmatic product sync is built for v1.

## Error handling

- **Checkout session creation fails** (e.g. missing/invalid price ID env var): the API route returns a 400/500 with a message; the signup form shows an inline error and offers a retry button. The account itself is already created and valid — retrying just calls checkout again.
- **Webhook signature invalid**: 400 response, no DB write, error logged server-side.
- **Duplicate/out-of-order webhook delivery**: all handlers are pure upserts keyed by `stripeCustomerId`/`stripeSubscriptionId` — replaying the same event twice is a no-op the second time.
- **User has no `stripeCustomerId` yet when hitting `/billing/reactivate`** (e.g. they abandoned checkout before ever reaching Stripe): the reactivate page's checkout call creates the customer lazily, same as first-time signup.

## Testing

This is inherently a browser + external-service flow, so testing is manual against Stripe test mode:

1. Use Stripe test mode keys (`sk_test_...`) locally, test card `4242 4242 4242 4242` (any future expiry/CVC)
2. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (Stripe CLI) during local dev to receive webhooks
3. Manual flow: sign up from `/signup?plan=growth` → confirm redirect to Stripe Checkout → complete with test card → confirm redirect to `/dashboard` → confirm `Merchant.subscriptionStatus` is `"trialing"` in the DB
4. `stripe trigger customer.subscription.deleted` → confirm the merchant is locked out and redirected to `/billing/reactivate` on next page load
5. Manage billing → confirm Customer Portal loads and a plan change updates `planTier` via webhook

## Out of scope for this pass

- Usage-based/metered billing (all 3 tiers are flat monthly)
- Annual billing option
- Proration handling beyond Stripe's defaults
- Read-only/degraded access mode (explicitly rejected in favor of full lock)
- API-route-level gating (only page-level via `requireSessionPage`)
