# Password Reset + Change Password — Design

## Context

Zorin currently has no account-recovery path: if a user forgets their password, they are permanently locked out (no reset, no support flow). This spec adds two related, bundled flows:

1. **Forgot password** — logged-out recovery via emailed reset link.
2. **Change password** — authenticated password change from `/settings`, added alongside the reset flow since it shares the same hashing/session logic and is a natural companion feature.

## Decisions made during brainstorming

- **Scope:** both the logged-out reset flow and the logged-in change-password flow are in scope for this spec (bundled per user request).
- **Session invalidation on reset:** a successful password *reset* (via emailed token) invalidates **all** sessions for that account — the assumption is a reset can follow account compromise, so force a clean re-login everywhere.
- **Session invalidation on change:** a successful *authenticated* password change invalidates all **other** sessions but keeps the current one alive, so the user isn't logged out of the tab they're using.
- **Reset token storage:** hashed at rest (SHA-256), not raw — a deliberate deviation from `Session`, which stores raw tokens. Reset tokens travel over email (a weaker channel than an httpOnly cookie) and grant a bigger privilege (arbitrary password change), so hashing at rest limits blast radius if the `PasswordResetToken` table is ever exposed (e.g. a DB backup leak).
- **One token at a time:** requesting a new reset deletes any existing unexpired token for that user before creating a new one.
- **Token expiry:** 1 hour.
- **No account enumeration:** `POST /api/auth/forgot-password` always responds `{ ok: true }` whether or not the email exists, mirroring the login route's constant-response-shape approach to avoid leaking which emails have accounts.
- **Email delivery:** reuses the existing Resend setup and `Zorin <onboarding@resend.dev>` sender (same as `notifyEarlyAccess`), fire-and-forget — a failed send never surfaces to the requester as an error, since the response is already generic.
- **Base URL for the reset link:** derived from `new URL(req.url).origin` at request time (the same pattern already used in `src/app/api/billing/checkout/route.ts` and `.../portal/route.ts`), not a new env var — this works automatically in both local dev and production.
- **Password length rule:** reuse the existing signup rule (minimum 8 characters, from `src/app/api/auth/signup/route.ts:30`) rather than inventing a new one.

## Architecture

**Forgot-password flow:**

```
/forgot-password (email form)
        │
        ▼
POST /api/auth/forgot-password
        │  rate-limited by IP (existing checkRateLimit)
        │  always responds { ok: true }
        │
        ├─ user exists? ─ no ─▶ (no-op, still returns ok:true)
        │
        └─ yes:
             delete any existing unexpired PasswordResetToken for user
             generate random token, store SHA-256 hash + 1h expiry
             email link {origin}/reset-password?token=<raw token> via Resend
                        │
                        ▼
        /reset-password?token=... (new password + confirm form)
                        │
                        ▼
        POST /api/auth/reset-password { token, newPassword }
                        │
              hash token, look up PasswordResetToken
              expired/not found → 400 error
              found → hash newPassword, update User.passwordHash
                       delete the used token
                       delete ALL Session rows for that user
                       (forces re-login everywhere)
```

**Change-password flow (authenticated):**

```
/settings → "Change password" card
        │
        ▼
POST /api/auth/change-password { currentPassword, newPassword }
        │  requireSessionApi()
        │
   verify currentPassword against User.passwordHash
   wrong → 401 error
   correct → hash newPassword, update User.passwordHash
             delete all OTHER Session rows for that user
             (current session cookie stays valid)
```

## Data model

New model, added to both `prisma/schema.prisma` and `prisma/schema.production.prisma` (per the existing dual-schema convention — forgetting one broke the first production deploy, per project history):

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

`User` gains a `passwordResetTokens PasswordResetToken[]` back-relation field.

After adding the model: `npx prisma db push` (dev) and `npx prisma generate` — the project has hit "stale Prisma client" bugs before when this step is skipped after a schema change.

## API routes

| Route | Auth | Behavior |
|---|---|---|
| `POST /api/auth/forgot-password` | Public, rate-limited | `{ email }` → always `{ ok: true }` |
| `POST /api/auth/reset-password` | Public (token-authenticated) | `{ token, newPassword }` → `{ ok: true }` or 400 on invalid/expired token |
| `POST /api/auth/change-password` | Session-required | `{ currentPassword, newPassword }` → `{ ok: true }` or 401 on wrong current password |

All three follow the existing `withErrorHandling` + `HttpError` convention used by every other API route.

## Pages

- `/forgot-password` — single email input, styled to match `/login`. Submits to the API, then shows a generic "if that email exists, we've sent a link" confirmation regardless of the response (belt-and-suspenders against enumeration — the UI doesn't even distinguish success paths).
- `/reset-password` — reads `token` from the query string (client component, `use(searchParams)` per the Next 16 convention already used elsewhere in this app), new-password + confirm-password fields, submits to the API, redirects to `/login` on success with a success message.
- `/settings` — existing page gains a new "Change password" card (current password, new password, confirm), placed near the existing `BillingCard`.
- `/login` — add a "Forgot password?" link near the password field, pointing at `/forgot-password`.

## Error handling

- Reset/change endpoints never leak *why* a token or password is invalid beyond a generic message ("This reset link is invalid or has expired" / "Current password is incorrect") — no distinction between "token not found" and "token expired" is surfaced to the client.
- Resend send failures inside `forgotPassword` are caught and swallowed (logged, not thrown) — the HTTP response is already generic `{ ok: true }` regardless, matching `notifyEarlyAccess`'s fire-and-forget behavior.
- Client-side: both forms validate password length (8+) and password-confirmation match before submitting, mirroring existing signup form validation.

## Testing

Following the existing route-test convention (e.g. `src/app/api/auth/signup/route.test.ts`, `login/route.test.ts`):

- `forgot-password/route.test.ts` — existing email creates a token + triggers email send; nonexistent email still returns `{ ok: true }` and sends nothing; rate limiting kicks in after repeated requests; a second request deletes the first token.
- `reset-password/route.test.ts` — valid token resets the password and invalidates sessions; expired token rejected; already-used (deleted) token rejected; malformed token rejected.
- `change-password/route.test.ts` — correct current password updates the hash and invalidates other sessions while keeping the current one; wrong current password rejected with 401; requires an active session.
- Component/page-level tests for `/forgot-password` and `/reset-password` client validation, matching existing signup page test patterns if any exist.

## Out of scope

- Email verification at signup (separate concern, not part of this spec).
- Team/multi-user roles — this app is still one-user-per-merchant, so there's no "reset another user's password" admin flow.
- CAPTCHA or additional bot protection beyond the existing IP rate limiter.
