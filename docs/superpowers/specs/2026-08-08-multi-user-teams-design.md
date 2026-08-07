# Multi-User Teams — Design

## Problem

Zorin currently enforces a strict 1:1 `User`:`Merchant` relationship (`User.merchantId` is `@unique`, `Merchant.user` is a single optional relation). A merchant with a co-founder or employee who needs access to pricing, connections, or settings has no way to grant it — the only option is sharing one login and password, which breaks session/audit hygiene and means everyone loses access if the password changes.

## Goal

Let a merchant (the account **Owner**) invite teammates by email to join their existing account as **Members**, with full product/pricing/settings access except billing and team management. Scoped explicitly to "one team, one store" — not multi-merchant switching for a single login.

## Non-goals

- No Admin role tier or granular permissions beyond Owner/Member. Every Member gets full access except billing/team-management, which stay Owner-only.
- No seat-based pricing or per-tier team-size limits. Unlimited teammates on any paid plan for this version — revisit only if real usage shows a need.
- No multi-merchant access for one login (an agency managing several client stores from one account). A person is a member of exactly one merchant; an invite to an email that already has a Zorin account (as an Owner or Member elsewhere) is rejected.
- No self-serve account/data deletion — pre-existing gap, unrelated to this feature.
- No restructuring of the `/settings` page into a sidebar/sub-pages layout. Team management is one more card on the existing single-page settings screen.
- No ownership transfer and no way for the Owner to leave/remove themselves. Exactly one Owner per merchant for the lifetime of this version — the `leave`/`remove` endpoints are Member-only by construction (an Owner calling `leave` is rejected, same as a Member calling the Owner-only routes). If ownership transfer is needed later, it's a separate, small follow-up.

## Data model

```prisma
model User {
  id                  String               @id @default(cuid())
  email               String               @unique
  passwordHash        String
  merchantId          String               // no longer @unique — many Users per Merchant
  role                String               @default("OWNER") // "OWNER" | "MEMBER"
  merchant            Merchant             @relation(fields: [merchantId], references: [id])
  createdAt           DateTime             @default(now())
  sessions            Session[]
  passwordResetTokens PasswordResetToken[]
}

model Invitation {
  id              String    @id @default(cuid())
  merchantId      String
  merchant        Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  email           String
  tokenHash       String    @unique
  invitedByUserId String
  expiresAt       DateTime
  acceptedAt      DateTime?
  createdAt       DateTime  @default(now())
}
```

- Dropping `@unique` on `User.merchantId` is the one breaking schema change; everything else is additive. `Merchant.user` (singular) becomes `Merchant.users User[]`.
- `role` defaults to `"OWNER"` at the column level so the migration backfills every existing user as Owner with no data pass required — matches today's reality (every current user is a sole account owner).
- `Invitation.tokenHash` follows the `PasswordResetToken` pattern: only the hash is stored, the raw token exists solely in the emailed link. `expiresAt` is 7 days from creation (longer than the 1-hour password-reset TTL, since an invite may sit in an inbox over a weekend).
- `acceptedAt` null = pending invite (shown in the Team card's pending list); non-null = accepted, kept for audit history rather than deleted.
- No uniqueness constraint tying `Invitation.email` to one pending row per merchant — resending is implemented by revoking the old row and creating a new one (see API routes), so at most one *pending* invite per email should exist in practice, enforced at the application layer rather than the schema.

## Why this is a small blast radius

Every existing merchant-scoped query in the 61 API routes that reference `merchantId` filters by `merchantId`, not `userId`. A Member hitting any of those routes gets identical, correctly-isolated results with **zero code changes** — tenant isolation was already merchant-shaped, not user-shaped. The only new permission surface is the small set of routes that must stay Owner-only.

## Permissions

New helper in `src/lib/auth/requireSession.ts` (alongside the existing `requireSessionApi`/`requireSessionPage`):

```typescript
export async function requireOwnerApi(): Promise<SessionUser> // throws/403s if role !== "OWNER"
```

`SessionUser` (`src/lib/auth/session.ts`) gains a `role` field, sourced the same way `merchantId` already is (straight off the `User` row on session lookup).

Owner-only: `POST /api/billing/*` (unchanged, already effectively account-level), team invite/remove/revoke/resend, disconnecting Shopify/WooCommerce (an Owner-level "blast radius" action — disconnecting breaks sync for the whole team). Everything else (products, pricing, Launch Planner, Van Westendorp surveys, competitor prices, connecting a new integration) stays open to any authenticated Member, unchanged.

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/team` | Any team member | List active members (email, role, joined date) and pending invitations |
| `POST /api/team/invite` | Owner | Create an `Invitation`, email the link |
| `POST /api/team/invitations/[id]/resend` | Owner | Revoke + recreate with a fresh token/expiry, re-send the email |
| `DELETE /api/team/invitations/[id]` | Owner | Revoke a pending invite |
| `DELETE /api/team/[userId]` | Owner | Remove a Member; destroys all their sessions immediately |
| `POST /api/team/leave` | Any Member (not Owner) | Self-removal; destroys the caller's own sessions |
| `GET /api/invite/[token]` | Public | Resolve an invite token → merchant/store name for display, or 404/expired state |
| `POST /api/invite/[token]/accept` | Public | Validates token + password, creates the `User` row (`role: MEMBER`), marks `acceptedAt`, creates a session |

Invite creation validates: email format, not already a pending invite for this merchant (revoke-and-recreate instead via resend), and not already an existing Zorin `User` anywhere (clear "This email already has a Zorin account" error — no silent merge, no multi-merchant membership).

## UI

- **`TeamCard.tsx`** on the existing `/settings` page, positioned near `BillingCard` — new card, not a new page/tab. Shows: active members table (email, role, joined date, "Remove" action next to non-Owner rows, only rendered for the Owner), pending invitations list (email, sent date, Resend/Revoke actions, Owner-only), and an "Invite teammate" button opening a simple modal (email field only — no role picker, per the Owner/Member-only decision).
- Members (non-Owner) see the same card in a read-only shape: their own row plus a "Leave team" action, no invite button, no remove actions on others.
- **`/invite/[token]` page** — public, chrome-free, same structural pattern as `/survey/[token]` (`use(params)`, status state machine: loading / not-found / expired / ready / submitting / done / error). Shows which store they're joining ("Join <Merchant.name> on Zorin"), a password field, submits to the accept route, then redirects to `/dashboard` on success.

## Email

New `src/lib/email/sendInvite.ts`, mirroring `notifySignup.ts`'s and `notifyEarlyAccess.ts`'s existing Resend pattern (same silent no-op if unconfigured, same non-blocking dispatch). Subject/body: "<Owner's merchant name> invited you to Zorin" with the accept link.

## Testing

- Migration: verify existing seeded users backfill to `role: "OWNER"` and existing single-user-per-merchant behavior is unaffected.
- `requireOwnerApi()`: unit tests for Owner-pass / Member-reject / unauthenticated-reject.
- Invite lifecycle: create → accept (happy path), create → expired token rejected, create → already-accepted token rejected (can't reuse), invite to an email that's already a Zorin user rejected, resend revokes the old token (old link stops working) and issues a new one.
- Removal/leave: Owner removes a Member → that Member's sessions are destroyed and their next request 401s; a Member calls leave → same; a Member cannot call the Owner-only remove/invite endpoints (403).
- `TeamCard.tsx`: Owner view shows invite/remove controls, Member view doesn't; pending invites render with resend/revoke actions.
- Regression sweep: spot-check a handful of the existing merchant-scoped routes (products, price history) confirm a Member gets the same data an Owner would, with no code changes needed — this is asserting the "small blast radius" claim above, not just hoping it's true.

## Migration

Two schema changes landing together: drop `@unique` on `User.merchantId`, add `User.role` (defaulted, so existing rows backfill automatically) and the new `Invitation` table. Additive except for the dropped unique constraint — that constraint drop is safe on both SQLite dev and production Postgres since it only *removes* a restriction, never conflicts with existing data. Same `prisma db push` deploy pattern as every prior schema change in this project; still worth the manual production confirmation pass.

## Out of scope (explicitly deferred)

- Admin role / granular permissions.
- Seat-based billing or per-tier team-size limits.
- Multi-merchant access for one login (agency use case).
- Audit log of who changed what within a shared account.
- Self-serve account/data deletion.
