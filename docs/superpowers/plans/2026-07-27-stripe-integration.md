# Stripe Subscription Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Stripe subscription billing to Zorin — 3-tier pricing (Starter/Growth/Scale), a 14-day card-required trial via Stripe Checkout, webhook-driven subscription state sync, a self-serve Stripe Customer Portal, and full dashboard lockout for merchants without an active subscription.

**Architecture:** Stripe's hosted Checkout collects the card and starts the trial; a webhook endpoint is the single source of truth for subscription state, written into new fields on `Merchant`; `requireSessionPage` (used by every protected server component) checks that state and redirects to a reactivate page when access should be blocked; Stripe's hosted Customer Portal handles plan changes/cancellation so no custom billing UI is built.

**Tech Stack:** Next.js App Router, Prisma (SQLite dev / Postgres prod), Stripe Node SDK (`stripe` npm package), Vitest for tests.

**User decisions (already made):**
- 14-day trial, card required upfront (not a no-card trial)
- No existing accounts to migrate — pre-launch product
- Signup redirects to Stripe-hosted Checkout (no custom card form / Stripe Elements)
- Stripe's hosted Customer Portal for self-serve billing management (no custom portal UI)
- Full dashboard lockout when subscription isn't `trialing`/`active` (no read-only degraded mode) — this includes `past_due`, a stricter rule than typical dunning grace periods, confirmed during spec review
- Gating is page-level only (`requireSessionPage`), not per-API-route, for this pass

---

## Spec coverage check

Every section of `docs/superpowers/specs/2026-07-27-stripe-integration-design.md` maps to a task below:
- Data model → Task 1
- `src/lib/stripe/client.ts`, `src/lib/stripe/plans.ts` → Task 2
- `src/lib/billing/subscriptionGate.ts` → Task 3
- `src/app/api/billing/checkout/route.ts` → Task 4
- `src/app/api/webhooks/stripe/route.ts` + `src/proxy.ts` CSRF exemption → Task 5
- `src/app/api/billing/portal/route.ts` → Task 6
- `requireSessionPage` gating → Task 7
- `src/app/billing/reactivate/page.tsx` → Task 8
- Signup flow + `Pricing.tsx` links → Task 9
- Settings page "Manage billing" → Task 10

---

### Task 1: Install Stripe SDK and add billing fields to the data model

**Goal:** The `stripe` package is installed and `Merchant` has the fields needed to track subscription state, in both the dev (SQLite) and production (Postgres) schemas.

**Files:**
- Modify: `package.json` (via `npm install stripe`)
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`
- Modify: `.env.example`

**Acceptance Criteria:**
- [ ] `stripe` is a dependency in `package.json`
- [ ] `Merchant` has `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `planTier`, `trialEndsAt` in both schema files
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma db push` succeeds against the local SQLite dev database
- [ ] `.env.example` documents the 5 new Stripe env vars

**Verify:** `npx prisma generate && npx prisma db push` → both commands exit 0, no errors

**Steps:**

- [ ] **Step 1: Install the Stripe SDK**

```bash
npm install stripe
```

- [ ] **Step 2: Add billing fields to `prisma/schema.prisma`**

Find the `Merchant` model and add the five new fields right after `createdAt`:

```prisma
model Merchant {
  id                String             @id @default(cuid())
  name              String
  storeUrl          String
  createdAt         DateTime           @default(now())
  stripeCustomerId     String?
  stripeSubscriptionId String?
  subscriptionStatus   String?
  planTier             String?
  trialEndsAt          DateTime?
  products               Product[]
  user                   User?
  shopifyConnection      ShopifyConnection?
  wooCommerceConnection  WooCommerceConnection?
}
```

- [ ] **Step 3: Apply the same fields to `prisma/schema.production.prisma`**

Same edit, same location, in the Postgres schema file:

```prisma
model Merchant {
  id                String             @id @default(cuid())
  name              String
  storeUrl          String
  createdAt         DateTime           @default(now())
  stripeCustomerId     String?
  stripeSubscriptionId String?
  subscriptionStatus   String?
  planTier             String?
  trialEndsAt          DateTime?
  products               Product[]
  user                   User?
  shopifyConnection      ShopifyConnection?
  wooCommerceConnection  WooCommerceConnection?
}
```

- [ ] **Step 4: Regenerate the Prisma client and push the schema to the dev database**

```bash
npx prisma generate
npx prisma db push
```

Expected: both commands complete without errors; `npx prisma db push` reports the `Merchant` table was updated.

- [ ] **Step 5: Add the new env vars to `.env.example`**

Append to the end of the file:

```
# Stripe — subscription billing (create a free account at stripe.com)
# Secret key: Dashboard → Developers → API keys
STRIPE_SECRET_KEY=""
# Webhook signing secret: Dashboard → Developers → Webhooks → your endpoint → Signing secret
# (or from `stripe listen` output when testing locally)
STRIPE_WEBHOOK_SECRET=""
# Price IDs: Dashboard → Product catalog → create one product per tier (monthly recurring)
STRIPE_PRICE_STARTER=""
STRIPE_PRICE_GROWTH=""
STRIPE_PRICE_SCALE=""
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma prisma/schema.production.prisma .env.example
git commit -m "feat: add Stripe SDK and billing fields to Merchant schema"
```

---

### Task 2: Stripe client singleton and plan tier mapping

**Goal:** A reusable Stripe SDK client and a typed mapping from plan tier strings to Stripe Price IDs, with tests for the mapping/validation logic.

**Files:**
- Create: `src/lib/stripe/client.ts`
- Create: `src/lib/stripe/plans.ts`
- Test: `src/lib/stripe/plans.test.ts`

**Acceptance Criteria:**
- [ ] `stripe` singleton client exported from `src/lib/stripe/client.ts`, following the same module-singleton pattern as `src/lib/db.ts`
- [ ] `PLAN_TIERS` array and `isValidPlanTier` type guard exported from `src/lib/stripe/plans.ts`
- [ ] `priceIdForTier` throws a clear error if the corresponding env var is missing (fail fast, not a silent `undefined` sent to Stripe)
- [ ] All tests in `src/lib/stripe/plans.test.ts` pass

**Verify:** `npx vitest run src/lib/stripe/plans.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Create the Stripe client singleton**

```ts
// src/lib/stripe/client.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
```

- [ ] **Step 2: Write the failing tests for the plan mapping**

```ts
// src/lib/stripe/plans.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLAN_TIERS, isValidPlanTier, priceIdForTier } from "./plans";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_PRICE_STARTER = "price_starter_123";
  process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
  process.env.STRIPE_PRICE_SCALE = "price_scale_123";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("PLAN_TIERS", () => {
  it("lists exactly starter, growth, scale in that order", () => {
    expect(PLAN_TIERS).toEqual(["starter", "growth", "scale"]);
  });
});

describe("isValidPlanTier", () => {
  it("returns true for each known tier", () => {
    expect(isValidPlanTier("starter")).toBe(true);
    expect(isValidPlanTier("growth")).toBe(true);
    expect(isValidPlanTier("scale")).toBe(true);
  });

  it("returns false for unknown strings", () => {
    expect(isValidPlanTier("enterprise")).toBe(false);
    expect(isValidPlanTier("")).toBe(false);
  });
});

describe("priceIdForTier", () => {
  it("returns the configured price id for a valid tier", () => {
    expect(priceIdForTier("growth")).toBe("price_growth_123");
  });

  it("throws when the tier's env var is missing", () => {
    delete process.env.STRIPE_PRICE_SCALE;
    expect(() => priceIdForTier("scale")).toThrow(/STRIPE_PRICE_SCALE/);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/stripe/plans.test.ts`
Expected: FAIL — `Cannot find module './plans'`

- [ ] **Step 4: Implement the plan mapping**

```ts
// src/lib/stripe/plans.ts
export const PLAN_TIERS = ["starter", "growth", "scale"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export function isValidPlanTier(value: string): value is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(value);
}

const ENV_VAR_BY_TIER: Record<PlanTier, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  scale: "STRIPE_PRICE_SCALE",
};

/** Resolve a plan tier to its Stripe Price ID. Throws if the env var isn't set. */
export function priceIdForTier(tier: PlanTier): string {
  const envVar = ENV_VAR_BY_TIER[tier];
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`Missing required env var ${envVar} for plan tier "${tier}"`);
  }
  return priceId;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stripe/plans.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe/client.ts src/lib/stripe/plans.ts src/lib/stripe/plans.test.ts
git commit -m "feat: add Stripe client singleton and plan tier mapping"
```

---

### Task 3: Subscription gate helper

**Goal:** A single, tested function that decides whether a subscription status grants dashboard access — the rule every gating check in this feature relies on.

**Files:**
- Create: `src/lib/billing/subscriptionGate.ts`
- Test: `src/lib/billing/subscriptionGate.test.ts`

**Acceptance Criteria:**
- [ ] `hasActiveSubscription("trialing")` and `hasActiveSubscription("active")` return `true`
- [ ] `hasActiveSubscription("past_due")`, `hasActiveSubscription("canceled")`, `hasActiveSubscription(null)` all return `false`
- [ ] All tests pass

**Verify:** `npx vitest run src/lib/billing/subscriptionGate.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/billing/subscriptionGate.test.ts
import { describe, expect, it } from "vitest";
import { hasActiveSubscription } from "./subscriptionGate";

describe("hasActiveSubscription", () => {
  it("allows trialing and active", () => {
    expect(hasActiveSubscription("trialing")).toBe(true);
    expect(hasActiveSubscription("active")).toBe(true);
  });

  it("blocks past_due, canceled, incomplete, unpaid", () => {
    expect(hasActiveSubscription("past_due")).toBe(false);
    expect(hasActiveSubscription("canceled")).toBe(false);
    expect(hasActiveSubscription("incomplete")).toBe(false);
    expect(hasActiveSubscription("unpaid")).toBe(false);
  });

  it("blocks null and unknown strings", () => {
    expect(hasActiveSubscription(null)).toBe(false);
    expect(hasActiveSubscription("something-unexpected")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/billing/subscriptionGate.test.ts`
Expected: FAIL — `Cannot find module './subscriptionGate'`

- [ ] **Step 3: Implement the gate**

```ts
// src/lib/billing/subscriptionGate.ts
const ACTIVE_STATUSES = new Set(["trialing", "active"]);

/**
 * Access is allowed only for "trialing" or "active" — every other status
 * (including "past_due") locks the dashboard, per the product decision to
 * use a hard lock rather than a dunning grace period.
 */
export function hasActiveSubscription(status: string | null): boolean {
  return status !== null && ACTIVE_STATUSES.has(status);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/billing/subscriptionGate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/subscriptionGate.ts src/lib/billing/subscriptionGate.test.ts
git commit -m "feat: add subscription gate helper"
```

---

### Task 4: Checkout API route

**Goal:** `POST /api/billing/checkout` creates (or reuses) a Stripe Customer for the merchant and returns a Stripe Checkout Session URL for a 14-day, card-required trial.

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`
- Test: `src/app/api/billing/checkout/route.test.ts`

**Acceptance Criteria:**
- [ ] Returns 401 when there's no session (via `requireSessionApi`)
- [ ] Returns 400 when `plan` is missing or not one of `starter`/`growth`/`scale`
- [ ] Creates a Stripe Customer and saves `stripeCustomerId` on the `Merchant` when one doesn't exist yet
- [ ] Reuses the existing `stripeCustomerId` on subsequent calls instead of creating a duplicate customer
- [ ] Creates a Checkout Session with `mode: "subscription"`, `trial_period_days: 14`, `payment_method_collection: "always"`, and the correct price ID for the requested tier
- [ ] Returns `{ url: <checkout session url> }` on success

**Verify:** `npx vitest run src/app/api/billing/checkout/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/api/billing/checkout/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { findUnique, update } },
}));

const { customersCreate, checkoutSessionsCreate } = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  checkoutSessionsCreate: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: { create: customersCreate },
    checkout: { sessions: { create: checkoutSessionsCreate } },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1" },
  })),
}));

process.env.STRIPE_PRICE_STARTER = "price_starter_123";
process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
process.env.STRIPE_PRICE_SCALE = "price_scale_123";

import { POST } from "./route";
import { requireSessionApi } from "@/lib/auth/requireSession";

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionApi).mockResolvedValue({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1" },
  });
});

describe("POST /api/billing/checkout", () => {
  it("returns 400 when plan is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when plan is invalid", async () => {
    const res = await POST(req({ plan: "enterprise" }));
    expect(res.status).toBe(400);
  });

  it("creates a Stripe customer when the merchant has none, and saves it", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: null });
    customersCreate.mockResolvedValue({ id: "cus_new123" });
    checkoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session1" });

    const res = await POST(req({ plan: "growth" }));

    expect(res.status).toBe(200);
    expect(customersCreate).toHaveBeenCalledWith({ email: "merchant@example.com" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { stripeCustomerId: "cus_new123" },
    });
  });

  it("reuses an existing Stripe customer instead of creating a new one", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: "cus_existing" });
    checkoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session2" });

    await POST(req({ plan: "growth" }));

    expect(customersCreate).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("creates a subscription checkout session with a 14-day trial and card required", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: "cus_existing" });
    checkoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session3" });

    const res = await POST(req({ plan: "scale" }));
    const body = await res.json();

    expect(body).toEqual({ url: "https://checkout.stripe.com/session3" });
    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        mode: "subscription",
        payment_method_collection: "always",
        line_items: [{ price: "price_scale_123", quantity: 1 }],
        subscription_data: { trial_period_days: 14 },
        success_url: expect.stringContaining("/dashboard"),
        cancel_url: expect.stringContaining("/billing/reactivate"),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/billing/checkout/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/billing/checkout/route.ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/billing/checkout/route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/billing/checkout/route.ts src/app/api/billing/checkout/route.test.ts
git commit -m "feat: add Stripe checkout session API route"
```

---

### Task 5: Webhook endpoint

**Goal:** `POST /api/webhooks/stripe` verifies Stripe's signature and keeps `Merchant.subscriptionStatus`/`planTier`/`trialEndsAt`/`stripeSubscriptionId` in sync as the source of truth for billing state.

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`
- Test: `src/app/api/webhooks/stripe/route.test.ts`
- Modify: `src/proxy.ts`

**Acceptance Criteria:**
- [ ] Returns 400 when the `stripe-signature` header is missing or invalid, without writing to the database
- [ ] `checkout.session.completed` sets `stripeSubscriptionId`, `planTier` (derived from the subscription's price ID), `subscriptionStatus: "trialing"`, and `trialEndsAt`
- [ ] `customer.subscription.updated` updates `subscriptionStatus` and `planTier` to match the event payload
- [ ] `customer.subscription.deleted` sets `subscriptionStatus: "canceled"`
- [ ] An unrecognized event type returns 200 without touching the database
- [ ] Processing the same event twice produces the same end state (idempotent — verified by calling the handler twice with an identical event and asserting the update call args are identical both times)
- [ ] `/api/webhooks/stripe` is in `src/proxy.ts`'s `CSRF_EXEMPT` set

**Verify:** `npx vitest run src/app/api/webhooks/stripe/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/api/webhooks/stripe/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMany } = vi.hoisted(() => ({ updateMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { updateMany } },
}));

const { constructEvent } = vi.hoisted(() => ({ constructEvent: vi.fn() }));

vi.mock("@/lib/stripe/client", () => ({
  stripe: { webhooks: { constructEvent } },
}));

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test123";

import { POST } from "./route";

function req(rawBody: string, signature = "sig_valid"): Request {
  return {
    text: async () => rawBody,
    headers: new Headers({ "stripe-signature": signature }),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  updateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when the signature header is missing", async () => {
    const badReq = { text: async () => "{}", headers: new Headers() } as unknown as Request;
    const res = await POST(badReq);
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification throws", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const res = await POST(req("{}"));
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("checkout.session.completed sets trialing status and plan tier", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: expect.objectContaining({
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "trialing",
      }),
    });
  });

  it("customer.subscription.updated syncs status and plan tier from the price id", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_123",
          id: "sub_123",
          status: "active",
          items: { data: [{ price: { id: "price_growth_123" } }] },
        },
      },
    });
    process.env.STRIPE_PRICE_STARTER = "price_starter_123";
    process.env.STRIPE_PRICE_GROWTH = "price_growth_123";
    process.env.STRIPE_PRICE_SCALE = "price_scale_123";

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: { subscriptionStatus: "active", planTier: "growth" },
    });
  });

  it("customer.subscription.deleted marks the merchant canceled", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_123", id: "sub_123" } },
    });

    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      data: { subscriptionStatus: "canceled" },
    });
  });

  it("ignores unrecognized event types without touching the database", async () => {
    constructEvent.mockReturnValue({ type: "invoice.paid", data: { object: {} } });
    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent — processing the same event twice yields identical writes", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_123", id: "sub_123" } },
    });

    await POST(req("{}"));
    await POST(req("{}"));

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.calls[0]).toEqual(updateMany.mock.calls[1]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/webhooks/stripe/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement the webhook route**

```ts
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { PLAN_TIERS, type PlanTier } from "@/lib/stripe/plans";

function planTierFromPriceId(priceId: string | undefined): PlanTier | null {
  if (!priceId) return null;
  const envVarByTier: Record<PlanTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH,
    scale: process.env.STRIPE_PRICE_SCALE,
  };
  for (const tier of PLAN_TIERS) {
    if (envVarByTier[tier] === priceId) return tier;
  }
  return null;
}

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
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await prisma.merchant.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "trialing",
          trialEndsAt,
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id;
      const planTier = planTierFromPriceId(priceId);
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
```

Note: the `checkout.session.completed` test above expects `updateMany` called with `data: expect.objectContaining({...})` (not an exact match) because this handler also writes `trialEndsAt`, which the test doesn't assert an exact value for.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/webhooks/stripe/route.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Add the webhook path to the CSRF exemption list**

In `src/proxy.ts`, find `CSRF_EXEMPT` and add the new path:

```ts
const CSRF_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/early-access",
  "/api/webhooks/stripe",
]);
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts src/app/api/webhooks/stripe/route.test.ts src/proxy.ts
git commit -m "feat: add Stripe webhook endpoint for subscription state sync"
```

---

### Task 6: Billing portal API route

**Goal:** `POST /api/billing/portal` creates a Stripe Customer Portal session so merchants can self-serve update their card, change plans, cancel, and view invoices.

**Files:**
- Create: `src/app/api/billing/portal/route.ts`
- Test: `src/app/api/billing/portal/route.test.ts`

**Acceptance Criteria:**
- [ ] Returns 401 when there's no session
- [ ] Returns 400 when the merchant has no `stripeCustomerId` (never went through checkout)
- [ ] Creates a portal session for the merchant's `stripeCustomerId` with `return_url` pointing at `/settings`
- [ ] Returns `{ url: <portal session url> }` on success

**Verify:** `npx vitest run src/app/api/billing/portal/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/api/billing/portal/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { merchant: { findUnique } },
}));

const { billingPortalSessionsCreate } = vi.hoisted(() => ({
  billingPortalSessionsCreate: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: { billingPortal: { sessions: { create: billingPortalSessionsCreate } } },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "merchant@example.com", merchantId: "m1" },
  })),
}));

import { POST } from "./route";

function req(): Request {
  return { url: "http://localhost:3000/api/billing/portal" } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/billing/portal", () => {
  it("returns 400 when the merchant has no Stripe customer yet", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: null });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(billingPortalSessionsCreate).not.toHaveBeenCalled();
  });

  it("creates a portal session and returns its url", async () => {
    findUnique.mockResolvedValue({ id: "m1", stripeCustomerId: "cus_123" });
    billingPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/session1" });

    const res = await POST(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: "https://billing.stripe.com/session1" });
    expect(billingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/settings",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/billing/portal/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { stripeCustomerId: true },
  });
  if (!merchant?.stripeCustomerId) {
    throw new HttpError(400, "No billing account found for this merchant yet");
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripeCustomerId,
    return_url: `${origin}/settings`,
  });

  return NextResponse.json({ url: session.url });
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/billing/portal/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/billing/portal/route.ts src/app/api/billing/portal/route.test.ts
git commit -m "feat: add Stripe billing portal API route"
```

---

### Task 7: Gate dashboard pages on subscription status

**Goal:** `requireSessionPage` redirects to `/billing/reactivate` when the merchant doesn't have an active/trialing subscription, protecting every page that calls it (dashboard, settings, launch-planner, guide) with one change.

**Files:**
- Modify: `src/lib/auth/requireSession.ts`
- Modify: `src/lib/auth/requireSession.test.ts`

**Acceptance Criteria:**
- [ ] `requireSessionPage` redirects to `/login` when there's no session (unchanged existing behavior)
- [ ] `requireSessionPage` redirects to `/billing/reactivate` when the session is valid but `subscriptionStatus` is not `trialing`/`active`
- [ ] `requireSessionPage` renders normally (returns the session) when `subscriptionStatus` is `trialing` or `active`
- [ ] `requireSessionApi` is unchanged — it does not check subscription status (page-level gating only, per spec)
- [ ] All existing and new tests in `requireSession.test.ts` pass

**Verify:** `npx vitest run src/lib/auth/requireSession.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add the failing tests to the existing test file**

Add these new `it` blocks inside the existing `describe("requireSessionPage", ...)` block in `src/lib/auth/requireSession.test.ts` (the file already has hoisted mocks for `getCookie`, `getSessionUser`, and `redirect` — reuse them):

```ts
// Add near the top, alongside the other vi.hoisted mocks:
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

// Update the existing `vi.mock("@/lib/db", ...)` line to:
vi.mock("@/lib/db", () => ({ prisma: { merchant: { findUnique } } }));

// Add to the existing beforeEach:
findUnique.mockReset();

// Add these tests inside describe("requireSessionPage", ...):
it("redirects to /billing/reactivate when subscription is not active", async () => {
  getCookie.mockReturnValue({ value: "tok" });
  getSessionUser.mockResolvedValue(user);
  findUnique.mockResolvedValue({ subscriptionStatus: "past_due" });

  await expect(requireSessionPage()).rejects.toThrow("REDIRECT:/billing/reactivate");
  expect(redirect).toHaveBeenCalledWith("/billing/reactivate");
});

it("redirects to /billing/reactivate when subscriptionStatus is null", async () => {
  getCookie.mockReturnValue({ value: "tok" });
  getSessionUser.mockResolvedValue(user);
  findUnique.mockResolvedValue({ subscriptionStatus: null });

  await expect(requireSessionPage()).rejects.toThrow("REDIRECT:/billing/reactivate");
});

it("returns the session when subscription is trialing", async () => {
  getCookie.mockReturnValue({ value: "tok" });
  getSessionUser.mockResolvedValue(user);
  findUnique.mockResolvedValue({ subscriptionStatus: "trialing" });

  await expect(requireSessionPage()).resolves.toEqual({ user, merchantId: "m1" });
});

it("returns the session when subscription is active", async () => {
  getCookie.mockReturnValue({ value: "tok" });
  getSessionUser.mockResolvedValue(user);
  findUnique.mockResolvedValue({ subscriptionStatus: "active" });

  await expect(requireSessionPage()).resolves.toEqual({ user, merchantId: "m1" });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run src/lib/auth/requireSession.test.ts`
Expected: FAIL — the 4 new tests fail because `requireSessionPage` doesn't check subscription status yet (and the existing `vi.mock("@/lib/db", ...)` needs updating first or the mock won't have `merchant.findUnique`)

- [ ] **Step 3: Update `requireSessionPage` to check subscription status**

```ts
// src/lib/auth/requireSession.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";
import { hasActiveSubscription } from "@/lib/billing/subscriptionGate";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "./session";

export interface SessionInfo {
  user: SessionUser;
  merchantId: string;
}

export async function getSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await getSessionUser(prisma, token);
  if (!user) return null;
  return { user, merchantId: user.merchantId };
}

// For API routes: withErrorHandling converts the throw into a 401 JSON response.
export async function requireSessionApi(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "unauthorized");
  return session;
}

// For server components: unauthenticated visitors land on the login page,
// and merchants without an active/trialing subscription land on the
// reactivate page instead of rendering the protected page.
export async function requireSessionPage(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.merchantId },
    select: { subscriptionStatus: true },
  });
  if (!hasActiveSubscription(merchant?.subscriptionStatus ?? null)) {
    redirect("/billing/reactivate");
  }

  return session;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/auth/requireSession.test.ts`
Expected: PASS (all tests, existing + 4 new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/requireSession.ts src/lib/auth/requireSession.test.ts
git commit -m "feat: gate protected pages on active subscription status"
```

---

### Task 8: Reactivate page

**Goal:** A page at `/billing/reactivate` that merchants without an active subscription land on — explains why, and lets them pick a plan to start checkout again.

**Files:**
- Create: `src/app/billing/reactivate/page.tsx`
- Create: `src/components/ReactivatePlanPicker.tsx`

**Acceptance Criteria:**
- [ ] Page requires a session (redirects to `/login` if none) but does NOT require an active subscription — it must be reachable precisely because the subscription isn't active, so it uses `getSession`/`redirect` directly rather than `requireSessionPage`
- [ ] Shows a clear "trial ended" / "subscription needs attention" message
- [ ] Shows the same three plans (Starter $39, Growth $99, Scale $249) with a button per plan
- [ ] Clicking a plan button calls `POST /api/billing/checkout` with that plan and redirects the browser to the returned URL
- [ ] Shows an inline error if the checkout call fails, without losing the rest of the page

**Verify:** Manual — see Task 9's end-to-end verification, which exercises this page as part of the full signup flow

**Steps:**

- [ ] **Step 1: Create the plan picker client component**

```tsx
// src/components/ReactivatePlanPicker.tsx
"use client";
import { useState } from "react";

const PLANS = [
  { tier: "starter", name: "Starter", price: "$39/mo" },
  { tier: "growth", name: "Growth", price: "$99/mo" },
  { tier: "scale", name: "Scale", price: "$249/mo" },
] as const;

export function ReactivatePlanPicker() {
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(tier: string) {
    setBusyTier(tier);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusyTier(null);
        return;
      }
      const data: { url: string } = await res.json();
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setBusyTier(null);
    }
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {PLANS.map((p) => (
        <div key={p.tier} className="rounded-xl border border-line bg-surface p-5 text-center">
          <p className="text-sm font-semibold text-ink">{p.name}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{p.price}</p>
          <button
            onClick={() => choose(p.tier)}
            disabled={busyTier !== null}
            className="btn mt-4 w-full"
          >
            {busyTier === p.tier ? "Redirecting…" : "Choose plan"}
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="col-span-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the reactivate page**

```tsx
// src/app/billing/reactivate/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { ReactivatePlanPicker } from "@/components/ReactivatePlanPicker";

export default async function ReactivatePage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUser(prisma, token) : null;
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-8 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">Your trial has ended</h1>
      <p className="mt-2 text-sm text-muted">
        Choose a plan to keep using Zorin — your products and pricing history are all still here.
      </p>
      <ReactivatePlanPicker />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/billing/reactivate/page.tsx src/components/ReactivatePlanPicker.tsx
git commit -m "feat: add billing reactivate page with plan picker"
```

---

### Task 9: Wire signup flow into checkout

**Goal:** Marketing pricing links carry the chosen plan through signup, and a successful signup redirects into Stripe Checkout instead of straight to the dashboard.

**Files:**
- Modify: `src/components/marketing/Pricing.tsx`
- Modify: `src/components/AuthForm.tsx`
- Modify: `src/app/signup/page.tsx`

**Acceptance Criteria:**
- [ ] Each pricing card's CTA links to `/signup?plan=starter`, `/signup?plan=growth`, or `/signup?plan=scale` respectively
- [ ] `AuthForm` accepts an optional `onSuccess` callback; when provided, it's called instead of the hardcoded `window.location.href = "/dashboard"` (login's usage is unaffected since it won't pass this prop)
- [ ] Signup page reads `plan` from the URL search params, defaulting to `"growth"` if missing or invalid
- [ ] On successful account creation, the signup page calls `POST /api/billing/checkout` with the resolved plan and redirects to the returned URL
- [ ] If the checkout call fails, the signup page redirects to `/dashboard` anyway — `requireSessionPage` will then redirect to `/billing/reactivate`, which offers the same plan picker as a retry path (this is a deliberate simplification: no separate inline-retry UI on the signup page itself)

**Verify:** Manual end-to-end test — see Step 5 below

**Steps:**

- [ ] **Step 1: Update the pricing card links**

In `src/components/marketing/Pricing.tsx`, update the `plans` array's `href` values:

```ts
const plans = [
  {
    name: "Starter",
    price: "$39",
    period: "/mo",
    description: "For stores testing the waters with data-driven pricing.",
    cta: "Start free trial",
    href: "/signup?plan=starter",
    highlight: false,
    features: [
      "Up to 25 products",
      "CSV upload",
      "Elasticity modeling",
      "Profit recommendations",
    ],
  },
  {
    name: "Growth",
    price: "$99",
    period: "/mo",
    description: "For growing stores ready to optimize their full catalog.",
    cta: "Start free trial",
    href: "/signup?plan=growth",
    highlight: true,
    features: [
      "Up to 150 products",
      "Shopify & WooCommerce sync",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    price: "$249",
    period: "/mo",
    description: "For catalogs and multi-store operations that outgrow the basics.",
    cta: "Talk to us",
    href: "/signup?plan=scale",
    highlight: false,
    features: [
      "Unlimited products",
      "Shopify & WooCommerce sync",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Multi-store support",
      "Dedicated support",
    ],
  },
];
```

(Only the three `href` lines actually change — the rest of the file, including all the styling, stays as-is.)

- [ ] **Step 2: Add an optional `onSuccess` prop to `AuthForm`**

```tsx
// src/components/AuthForm.tsx
"use client";
import { useState } from "react";

interface Field {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "url";
  placeholder?: string;
  required?: boolean;
}

export function AuthForm({
  fields,
  submitLabel,
  endpoint,
  onSuccess,
}: {
  fields: Field[];
  submitLabel: string;
  endpoint: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      if (onSuccess) {
        await onSuccess();
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="text-sm text-muted">{f.label}</span>
          <input
            type={f.type}
            required={f.required !== false}
            placeholder={f.placeholder}
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </label>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Wire the signup page to read the plan and start checkout on success**

In `src/app/signup/page.tsx`, add `useSearchParams` and pass `onSuccess` to `AuthForm`. Add these imports at the top:

```tsx
import { useSearchParams } from "next/navigation";
```

Add this near the top of the `SignupPage` function body (right after the existing `useState` calls):

```tsx
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const plan = rawPlan === "starter" || rawPlan === "growth" || rawPlan === "scale" ? rawPlan : "growth";

  async function startCheckout() {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        window.location.href = "/dashboard";
        return;
      }
      const data: { url: string } = await res.json();
      window.location.href = data.url;
    } catch {
      window.location.href = "/dashboard";
    }
  }
```

Then update the `<AuthForm ... />` usage to pass the new prop:

```tsx
            <AuthForm
              endpoint="/api/auth/signup"
              submitLabel="Create account"
              onSuccess={startCheckout}
              fields={[
                { name: "email", label: "Email", type: "email", placeholder: "you@store.com" },
                { name: "password", label: "Password (8+ characters)", type: "password" },
                { name: "storeName", label: "Store name", type: "text" },
                { name: "storeUrl", label: "Store URL (optional)", type: "url", required: false },
              ]}
            />
```

Also update the subhead copy just above it, since "No credit card needed" is no longer accurate:

```tsx
          <p className="mt-1.5 text-sm text-zinc-500">Start your 14-day free trial. Cancel anytime.</p>
```

- [ ] **Step 4: Wrap the page in a `Suspense` boundary**

`useSearchParams()` requires the page to be wrapped in `<Suspense>` in the Next.js App Router. Rename the current default-exported function to `SignupPageInner` and add a wrapper:

```tsx
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}
```

Add `Suspense` to the existing `"use client"` imports at the top of the file:

```tsx
import { Suspense, useState, useEffect } from "react";
```

- [ ] **Step 5: Manual end-to-end verification**

This flow requires a real Stripe test-mode account, so it can't be scripted. With `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE` set to test-mode values in `.env`, and `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running in a separate terminal with its printed webhook secret copied into `STRIPE_WEBHOOK_SECRET`:

1. Run `npm run dev`
2. Visit `http://localhost:3000/#pricing`, click "Start free trial" on the Growth card
3. Confirm the browser is now at `/signup?plan=growth`
4. Fill in the signup form and submit
5. Confirm the browser redirects to a `checkout.stripe.com` URL
6. Complete checkout with test card `4242 4242 4242 4242`, any future expiry, any CVC
7. Confirm the browser redirects back to `/dashboard?checkout=success` and the dashboard renders (not a redirect loop back to reactivate)
8. Check the `stripe listen` terminal — confirm a `checkout.session.completed` event was forwarded and returned 200
9. Inspect the dev database: `npx prisma studio`, open `Merchant`, confirm `subscriptionStatus` is `"trialing"` and `planTier` is `"growth"`

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/Pricing.tsx src/components/AuthForm.tsx src/app/signup/page.tsx
git commit -m "feat: wire signup flow into Stripe checkout"
```

---

### Task 10: Manage billing in Settings

**Goal:** The Settings page shows the merchant's current plan/status and offers a "Manage billing" button that opens the Stripe Customer Portal.

**Files:**
- Create: `src/components/BillingCard.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] Settings page shows the merchant's `planTier` and `subscriptionStatus`
- [ ] "Manage billing" button calls `POST /api/billing/portal` and redirects to the returned URL
- [ ] Shows an inline error if the portal call fails

**Verify:** Manual — click "Manage billing" on `/settings` while signed in with an active trial (from Task 9's verification) and confirm it redirects to a `billing.stripe.com` URL

**Steps:**

- [ ] **Step 1: Create the billing card component**

```tsx
// src/components/BillingCard.tsx
"use client";
import { useState } from "react";

export function BillingCard({
  planTier,
  subscriptionStatus,
}: {
  planTier: string | null;
  subscriptionStatus: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      const data: { url: string } = await res.json();
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Billing</h2>
      <p className="mt-2 text-sm text-muted">
        Plan: <span className="font-medium text-ink">{planTier ?? "None"}</span>
        {" · "}
        Status: <span className="font-medium text-ink">{subscriptionStatus ?? "Inactive"}</span>
      </p>
      <button onClick={openPortal} disabled={busy} className="btn mt-4">
        {busy ? "Loading…" : "Manage billing"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Add the card to the Settings page**

```tsx
// src/app/settings/page.tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";
import { BillingCard } from "@/components/BillingCard";

export default async function SettingsPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true, planTier: true, subscriptionStatus: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="space-y-6">
          <BillingCard
            planTier={merchant?.planTier ?? null}
            subscriptionStatus={merchant?.subscriptionStatus ?? null}
          />
          <ShopifyConnectionCard />
          <WooCommerceConnectionCard />
        </div>
      </main>
    </AppShell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BillingCard.tsx src/app/settings/page.tsx
git commit -m "feat: show billing status and manage-billing button in settings"
```

---

## Final verification (after all tasks)

1. `npx vitest run` → all tests pass across the whole suite
2. `npx tsc --noEmit` → no type errors
3. Repeat the manual end-to-end flow from Task 9 Step 5 in full, then additionally:
   - Run `stripe trigger customer.subscription.deleted` (Stripe CLI) → confirm the merchant is locked out and the next page load redirects to `/billing/reactivate`
   - From `/settings`, click "Manage billing" → confirm the Stripe Customer Portal loads
