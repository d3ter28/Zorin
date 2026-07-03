# Auth + Multi-Tenant — Design Spec

**Date:** 2026-07-03
**Status:** Approved for implementation

## Problem

PriceIQ has a single seeded merchant resolved via `prisma.merchant.findFirst()` and no authentication. Every API route (`products`, `ingest`, `apply`, `refresh`) is unprotected and unscoped. This spec adds real user accounts and per-merchant data isolation — the prerequisite for alerts, Shopify OAuth, and any real users.

## Decisions (locked)

- **Auth mechanism:** email + password, hand-rolled. No Auth.js, no OAuth, no magic links — the app must not depend on the network for login.
- **Account model:** 1 user = 1 merchant. Signup creates both. No teams, invites, or multi-store.
- **Sessions:** DB-backed `Session` table, random token in an httpOnly cookie. Revocable; no signing secret to manage.
- **Enforcement:** a `requireSession()` helper inside each API route and server page — NOT Next.js edge middleware (Prisma's Node APIs crash the edge runtime; same reason `instrumentation.ts` gates on `NEXT_RUNTIME`).

## Schema (additive)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  merchantId   String   @unique
  merchant     Merchant @relation(fields: [merchantId], references: [id])
  createdAt    DateTime @default(now())
  sessions     Session[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- Token: 32 random bytes, hex-encoded (`crypto.randomBytes`).
- Expiry: 30 days.
- Cookie: name `priceiq_session`, httpOnly, `sameSite: "lax"`, `path: "/"`, `secure` when `NODE_ENV === "production"`.
- Sync with `npx prisma db push` (project uses no migrations).
- Seed: create user `demo@priceiq.example` with password `demo1234` attached to the existing seeded merchant.

## New library: `src/lib/auth/`

Each file has a matching `.test.ts`, Prisma-injectable like the scrape modules.

- **`password.ts`** — `hashPassword(plain)` / `verifyPassword(plain, hash)` using argon2id via `@node-rs/argon2` (new direct dependency).
- **`session.ts`** — `createSession(prisma, userId)` returns `{ token, expiresAt }`; `getSessionUser(prisma, token)` returns the user (with `merchantId`) or null, deleting the row if expired; `destroySession(prisma, token)`.
- **`requireSession.ts`** — reads the cookie via `next/headers`:
  - `requireSessionApi()` — for API routes; returns `{ user, merchantId }` or a `NextResponse` 401 `{ error: "unauthorized" }`.
  - `requireSessionPage()` — for server components; returns `{ user, merchantId }` or `redirect("/login")`.

## Auth routes and pages

- **`POST /api/auth/signup`** — body `{ email, password, storeName, storeUrl }`. Validation: email format, password ≥ 8 chars, non-empty store name. Creates Merchant + User in one transaction, then a session. Duplicate email → 409. Success → 201 with the session cookie set.
- **`POST /api/auth/login`** — body `{ email, password }`. Wrong email or password → 401 with the same generic message (no user-existence leak). Success → session cookie.
- **`POST /api/auth/logout`** — destroys the session row, clears the cookie.
- **`/signup` and `/login` pages** — client components styled like the existing components (Tailwind v4 tokens). On success, `window.location.href = "/"`.
- **Dashboard header** — shows the merchant's store name and a logout button.

## Tenant scoping

Every data route and server page resolves `merchantId` from the session (replacing `findFirst()`):

- **List queries** add `where: { merchantId }` (products) or `where: { product: { merchantId } }` (competitor/observation data).
- **By-id routes** (`GET/POST /api/products/[id]/*`, apply routes, `/product/[id]` page) verify the product's `merchantId` matches the session. Mismatch or missing → **404** (never 403 — no existence leak).
- **`POST /api/refresh`** (bulk) — filter the requested `productIds` to those owned by the session merchant before refreshing.
- **`POST /api/products/catalog`** and **`POST /api/ingest`** — import into the session merchant.
- **Auto-refresh background job** — unchanged; it is system-level and iterates all merchants' products by design.

## Error handling

- Unauthenticated API call → 401 JSON; unauthenticated page → redirect to `/login`.
- Signup/login validation failures → 400 with a field-level message; duplicate email → 409.
- Login failure (bad email OR bad password) → 401 `{ error: "invalid credentials" }`.
- Expired session behaves exactly like no session (row deleted lazily on lookup).

## Testing

- **Unit (`src/lib/auth/`):** password hash/verify round-trip + wrong-password rejection; session create → get → expire (past `expiresAt` returns null and deletes) → destroy.
- **Route handlers:** signup happy path, duplicate email, weak password; login happy/wrong-password/unknown-email (same 401 body); logout clears.
- **Scoping tests:** seed two merchants with products in-test; assert (a) list endpoints return only the session merchant's rows, (b) by-id access to the other merchant's product returns 404, (c) bulk refresh ignores foreign ids.
- Follow existing patterns: node Vitest project, injectable Prisma, no network.

## Out of scope

Teams/invites, password reset, email verification, rate limiting/lockout, OAuth (Shopify comes later), CSRF tokens beyond `sameSite: lax`, remember-me/short sessions.

## Docs

Update `docs/HANDOVER.md`: status line, new auth section, demo credentials, test counts.
