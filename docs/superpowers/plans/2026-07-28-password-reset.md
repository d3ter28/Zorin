# Password Reset + Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add logged-out password recovery (emailed reset link) and an authenticated change-password option in Settings.

**Architecture:** A new `PasswordResetToken` model stores a SHA-256 hash of a one-time, 1-hour-expiry token per user. `POST /api/auth/forgot-password` emails a reset link via Resend (reusing the existing sender); `POST /api/auth/reset-password` consumes the token, updates the password, and destroys all sessions for that user. `POST /api/auth/change-password` verifies the current password, updates the hash, and destroys all *other* sessions (keeping the caller logged in). Two new pages (`/forgot-password`, `/reset-password`) reuse the existing `AuthForm` component; a new `ChangePasswordCard` is added to `/settings`.

**Tech Stack:** Next.js App Router, Prisma (dual schema.prisma / schema.production.prisma), Argon2id (`@node-rs/argon2` via `src/lib/auth/password.ts`), Resend, Vitest.

**User decisions (already made):**
- Bundle both forgot-password and authenticated change-password into this one plan.
- Reset (via email token) invalidates ALL sessions for the account; authenticated change-password invalidates all OTHER sessions but keeps the current one.
- Reset tokens are hashed (SHA-256) at rest, unlike `Session` which stores raw tokens — deliberate deviation, reset tokens travel over a weaker channel (email) and grant a bigger privilege.
- One reset token per user at a time — requesting a new one deletes any existing unexpired one.
- 1-hour token expiry.
- No account-enumeration: `forgot-password` always returns `{ ok: true }`.
- Reset link base URL comes from `new URL(req.url).origin` (existing convention from `src/app/api/billing/checkout/route.ts`), not a new env var.
- Password minimum length: 8 characters (existing signup rule).

---

## File Structure

**New files:**
- `prisma/schema.prisma` / `prisma/schema.production.prisma` — add `PasswordResetToken` model + `User.passwordResetTokens` back-relation (both files, per the dual-schema convention this project already follows).
- `src/lib/auth/resetToken.ts` — token generation, hashing, and single-use consumption. One responsibility: turning a raw token into a DB row and back.
- `src/lib/email/sendPasswordResetEmail.ts` — Resend send call, mirrors `src/lib/email/notifyEarlyAccess.ts`'s fire-and-forget pattern but sends *to* the requesting user instead of the founder.
- `src/app/api/auth/forgot-password/route.ts` + `route.test.ts`
- `src/app/api/auth/reset-password/route.ts` + `route.test.ts`
- `src/app/api/auth/change-password/route.ts` + `route.test.ts`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/components/ChangePasswordCard.tsx`

**Modified files:**
- `src/lib/auth/session.ts` — add `destroyAllSessions` and `destroyOtherSessions`.
- `src/lib/auth/session.test.ts` — tests for the two new functions.
- `src/app/login/page.tsx` — add a "Forgot password?" link.
- `src/app/settings/page.tsx` — render `<ChangePasswordCard />`.

---

## Task 1: Schema + session invalidation helpers

**Goal:** Add the `PasswordResetToken` model to both Prisma schemas and add session-invalidation helpers that later tasks depend on.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`
- Modify: `src/lib/auth/session.ts`
- Modify: `src/lib/auth/session.test.ts`

**Acceptance Criteria:**
- [ ] `PasswordResetToken` model exists in both schema files with identical shape.
- [ ] `npx prisma generate` runs without error.
- [ ] `destroyAllSessions(prisma, userId)` deletes every session row for that user.
- [ ] `destroyOtherSessions(prisma, userId, keepToken)` deletes every session row for that user except the one matching `keepToken`.
- [ ] Existing session tests still pass.

**Verify:** `npm test -- session.test.ts --run` → all tests pass, including the two new ones.

**Steps:**

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Add after the `Session` model (around line 112):

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

And add the back-relation to `User` (it currently ends at `sessions Session[]`):

```prisma
model User {
  id                  String               @id @default(cuid())
  email               String               @unique
  passwordHash        String
  merchantId          String               @unique
  merchant            Merchant             @relation(fields: [merchantId], references: [id])
  createdAt           DateTime             @default(now())
  sessions            Session[]
  passwordResetTokens PasswordResetToken[]
}
```

- [ ] **Step 2: Make the identical change to `prisma/schema.production.prisma`**

Both files must stay in sync — this project's history includes a broken deploy from forgetting to update the production schema alongside the dev one. Apply the exact same two edits (the `PasswordResetToken` model + the `User.passwordResetTokens` field) to `prisma/schema.production.prisma`.

- [ ] **Step 3: Sync the dev database and regenerate the client**

Run:
```bash
npx prisma db push
npx prisma generate
```
Expected: both commands exit 0. Skipping `prisma generate` after a schema change is a known failure mode in this project ("stale Prisma client" — symptom: `Unknown argument` or `Cannot read properties of undefined`).

- [ ] **Step 4: Write failing tests for the new session helpers**

Add to `src/lib/auth/session.test.ts` (below the existing `destroySession` describe block):

```typescript
describe("destroyAllSessions", () => {
  it("deletes every session for the user", async () => {
    deleteMany.mockResolvedValue({ count: 3 });
    await destroyAllSessions(prisma, "u1");
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});

describe("destroyOtherSessions", () => {
  it("deletes every session for the user except the given token", async () => {
    deleteMany.mockResolvedValue({ count: 2 });
    await destroyOtherSessions(prisma, "u1", "keep-me");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", token: { not: "keep-me" } },
    });
  });
});
```

Update the import line at the top of the file to include the two new names:

```typescript
import { createSession, destroyAllSessions, destroyOtherSessions, destroySession, getSessionUser, SESSION_TTL_MS } from "./session";
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test -- session.test.ts --run`
Expected: FAIL — `destroyAllSessions is not defined` (or similar import error).

- [ ] **Step 6: Implement the two functions in `src/lib/auth/session.ts`**

Add after `destroySession`:

```typescript
export async function destroyAllSessions(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function destroyOtherSessions(
  prisma: PrismaClient,
  userId: string,
  keepToken: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId, token: { not: keepToken } } });
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- session.test.ts --run`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat: add PasswordResetToken model and session invalidation helpers"
```

---

## Task 2: Reset token generation and consumption

**Goal:** A small, independently-testable module that turns a password-reset request into a hashed, single-use, expiring DB row, and back again.

**Files:**
- Create: `src/lib/auth/resetToken.ts`
- Create: `src/lib/auth/resetToken.test.ts`

**Acceptance Criteria:**
- [ ] `createPasswordResetToken` returns a raw hex token, stores only its SHA-256 hash, sets a 1-hour expiry, and deletes any prior unexpired token for that user first.
- [ ] `consumePasswordResetToken` returns `{ userId }` for a valid, unexpired token and deletes the row (single-use).
- [ ] `consumePasswordResetToken` returns `null` for an unknown token.
- [ ] `consumePasswordResetToken` returns `null` and deletes the row for an expired token.

**Verify:** `npm test -- resetToken.test.ts --run` → all tests pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/resetToken.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPasswordResetToken, consumePasswordResetToken, RESET_TOKEN_TTL_MS } from "./resetToken";

const create = vi.fn();
const findUnique = vi.fn();
const deleteMany = vi.fn();
const prisma = {
  passwordResetToken: { create, findUnique, deleteMany },
} as unknown as PrismaClient;

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  deleteMany.mockReset();
});

describe("createPasswordResetToken", () => {
  it("returns a 64-hex-char raw token, stores its hash (not the raw value), with a ~1h expiry", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    create.mockResolvedValue({});
    const before = Date.now();

    const token = await createPasswordResetToken(prisma, "u1");

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(create).toHaveBeenCalledTimes(1);
    const createArgs = create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe("u1");
    expect(createArgs.data.tokenHash).not.toBe(token);
    expect(createArgs.data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS - 1000);
  });

  it("deletes any existing token for the user before creating a new one", async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    create.mockResolvedValue({});
    await createPasswordResetToken(prisma, "u1");
    expect(deleteMany).toHaveBeenCalledBefore(create as never);
  });
});

describe("consumePasswordResetToken", () => {
  it("returns the userId and deletes the row for a valid, unexpired token", async () => {
    findUnique.mockResolvedValue({
      id: "prt1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    deleteMany.mockResolvedValue({ count: 1 });

    await expect(consumePasswordResetToken(prisma, "raw-token")).resolves.toEqual({ userId: "u1" });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "prt1" } });
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    await expect(consumePasswordResetToken(prisma, "nope")).resolves.toBeNull();
  });

  it("returns null and deletes the row for an expired token", async () => {
    findUnique.mockResolvedValue({
      id: "prt1",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    });
    deleteMany.mockResolvedValue({ count: 1 });

    await expect(consumePasswordResetToken(prisma, "raw-token")).resolves.toBeNull();
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "prt1" } });
  });
});
```

Note: `toHaveBeenCalledBefore` requires `jest-extended`-style matchers which this project does not have installed — replace that one assertion with call-order tracking instead:

```typescript
  it("deletes any existing token for the user before creating a new one", async () => {
    const order: string[] = [];
    deleteMany.mockImplementation(async () => { order.push("deleteMany"); return { count: 1 }; });
    create.mockImplementation(async () => { order.push("create"); return {}; });
    await createPasswordResetToken(prisma, "u1");
    expect(order).toEqual(["deleteMany", "create"]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- resetToken.test.ts --run`
Expected: FAIL with "Cannot find module './resetToken'".

- [ ] **Step 3: Implement `src/lib/auth/resetToken.ts`**

```typescript
import { randomBytes, createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Deletes any existing token for the user first, so only one is ever valid
// at a time. Returns the raw token — only the caller (the email) ever sees
// it; the DB stores just its hash.
export async function createPasswordResetToken(
  prisma: PrismaClient,
  userId: string,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({ data: { tokenHash, userId, expiresAt } });

  return token;
}

// Single-use: the row is deleted whether the token is valid or expired.
// Returns null for both "not found" and "expired" — callers must not
// distinguish between the two in any user-facing message.
export async function consumePasswordResetToken(
  prisma: PrismaClient,
  rawToken: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return null;

  await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });

  if (record.expiresAt.getTime() <= Date.now()) return null;
  return { userId: record.userId };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- resetToken.test.ts --run`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/resetToken.ts src/lib/auth/resetToken.test.ts
git commit -m "feat: add password reset token generation and consumption"
```

---

## Task 3: forgot-password route + reset email

**Goal:** `POST /api/auth/forgot-password` accepts an email, silently no-ops for unknown addresses, and emails a reset link for known ones — always responding `{ ok: true }`.

**Files:**
- Create: `src/lib/email/sendPasswordResetEmail.ts`
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/forgot-password/route.test.ts`

**Acceptance Criteria:**
- [ ] Rate-limited by IP using the existing `checkRateLimit`, same as `login`/`signup` (429 on exceeding).
- [ ] Unknown email still returns `{ ok: true }` with status 200, and never calls the token/email helpers.
- [ ] Known email creates a reset token and calls the email sender with a link built from `new URL(req.url).origin`.
- [ ] `sendPasswordResetEmail` no-ops (does not throw) when `RESEND_API_KEY` is unset.

**Verify:** `npm test -- forgot-password --run` → all tests pass.

**Steps:**

- [ ] **Step 1: Implement the email helper**

Create `src/lib/email/sendPasswordResetEmail.ts`:

```typescript
import { Resend } from "resend";

// Fire-and-forget, same convention as notifyEarlyAccess.ts — a failed send
// is logged but never surfaces to the caller, since the forgot-password
// route always returns a generic { ok: true } regardless.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Zorin <onboarding@resend.dev>",
      to,
      subject: "Reset your Zorin password",
      text: [
        "Click the link below to reset your Zorin password. This link expires in 1 hour.",
        "",
        resetUrl,
        "",
        "If you didn't request this, you can safely ignore this email.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}
```

- [ ] **Step 2: Write the failing route tests**

Create `src/app/api/auth/forgot-password/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));
const { createPasswordResetToken } = vi.hoisted(() => ({ createPasswordResetToken: vi.fn() }));
const { sendPasswordResetEmail } = vi.hoisted(() => ({ sendPasswordResetEmail: vi.fn() }));
const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: userFindUnique } } }));
vi.mock("@/lib/auth/resetToken", () => ({ createPasswordResetToken }));
vi.mock("@/lib/email/sendPasswordResetEmail", () => ({ sendPasswordResetEmail }));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit }));

import { POST } from "./route";

const fakeHeaders = new Headers({ "x-forwarded-for": "127.0.0.1" });
const req = (body: unknown) =>
  ({ json: async () => body, headers: fakeHeaders, url: "http://localhost:3000/api/auth/forgot-password" }) as unknown as Request;

beforeEach(() => {
  userFindUnique.mockReset();
  createPasswordResetToken.mockReset();
  sendPasswordResetEmail.mockReset();
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns ok:true and sends nothing for an unknown email", async () => {
    userFindUnique.mockResolvedValue(null);
    const res = await POST(req({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(createPasswordResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a token and emails a reset link for a known email", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", email: "demo@zorin.example" });
    createPasswordResetToken.mockResolvedValue("rawtoken123");

    const res = await POST(req({ email: "demo@zorin.example" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(createPasswordResetToken).toHaveBeenCalledWith(expect.anything(), "u1");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "demo@zorin.example",
      "http://localhost:3000/reset-password?token=rawtoken123",
    );
  });

  it("returns 429 when rate-limited", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 60_000 });
    const res = await POST(req({ email: "demo@zorin.example" }));
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- forgot-password --run`
Expected: FAIL with "Cannot find module './route'".

- [ ] **Step 4: Implement the route**

Create `src/app/api/auth/forgot-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { createPasswordResetToken } from "@/lib/auth/resetToken";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";

export const POST = withErrorHandling(async (req: Request) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterMs } = await checkRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`);
  }

  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Always the same response shape regardless of whether the email exists —
  // no account-enumeration oracle, same principle as the login route.
  if (email !== "") {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createPasswordResetToken(prisma, user.id);
      const origin = new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
  }

  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- forgot-password --run`
Expected: PASS, all 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/sendPasswordResetEmail.ts src/app/api/auth/forgot-password/
git commit -m "feat: add forgot-password route and reset email sender"
```

---

## Task 4: reset-password route

**Goal:** `POST /api/auth/reset-password` consumes a valid token, sets the new password, and invalidates all sessions for that user.

**Files:**
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.test.ts`

**Acceptance Criteria:**
- [ ] Missing/empty token or password < 8 chars → 400.
- [ ] Invalid or expired token → 400 with a generic message (does not distinguish "not found" from "expired").
- [ ] Valid token → hashes the new password, updates `User.passwordHash`, calls `destroyAllSessions`.

**Verify:** `npm test -- reset-password --run` → all tests pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/auth/reset-password/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userUpdate } = vi.hoisted(() => ({ userUpdate: vi.fn() }));
const { consumePasswordResetToken } = vi.hoisted(() => ({ consumePasswordResetToken: vi.fn() }));
const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn() }));
const { destroyAllSessions } = vi.hoisted(() => ({ destroyAllSessions: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { update: userUpdate } } }));
vi.mock("@/lib/auth/resetToken", () => ({ consumePasswordResetToken }));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyAllSessions,
}));

import { POST } from "./route";

const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;

beforeEach(() => {
  userUpdate.mockReset();
  consumePasswordResetToken.mockReset();
  hashPassword.mockReset();
  destroyAllSessions.mockReset();
});

describe("POST /api/auth/reset-password", () => {
  it("resets the password and invalidates all sessions for a valid token", async () => {
    consumePasswordResetToken.mockResolvedValue({ userId: "u1" });
    hashPassword.mockResolvedValue("newhash");
    userUpdate.mockResolvedValue({});
    destroyAllSessions.mockResolvedValue(undefined);

    const res = await POST(req({ token: "rawtoken", newPassword: "newpassword1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { passwordHash: "newhash" } });
    expect(destroyAllSessions).toHaveBeenCalledWith(expect.anything(), "u1");
  });

  it("rejects an invalid or expired token with a generic 400", async () => {
    consumePasswordResetToken.mockResolvedValue(null);
    const res = await POST(req({ token: "bad", newPassword: "newpassword1" }));
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a short new password with 400 before touching the token", async () => {
    const res = await POST(req({ token: "rawtoken", newPassword: "short" }));
    expect(res.status).toBe(400);
    expect(consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it("rejects a missing token with 400", async () => {
    const res = await POST(req({ newPassword: "newpassword1" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- reset-password --run`
Expected: FAIL with "Cannot find module './route'".

- [ ] **Step 3: Implement the route**

Create `src/app/api/auth/reset-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/resetToken";
import { destroyAllSessions } from "@/lib/auth/session";

const GENERIC_TOKEN_ERROR = "This reset link is invalid or has expired";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (token === "") throw new HttpError(400, GENERIC_TOKEN_ERROR);
  if (newPassword.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

  const consumed = await consumePasswordResetToken(prisma, token);
  if (!consumed) throw new HttpError(400, GENERIC_TOKEN_ERROR);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: consumed.userId }, data: { passwordHash } });
  await destroyAllSessions(prisma, consumed.userId);

  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- reset-password --run`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/reset-password/
git commit -m "feat: add reset-password route"
```

---

## Task 5: change-password route (authenticated)

**Goal:** `POST /api/auth/change-password` verifies the current password, updates it, and invalidates every other session while keeping the caller's current session alive.

**Files:**
- Create: `src/app/api/auth/change-password/route.ts`
- Create: `src/app/api/auth/change-password/route.test.ts`

**Acceptance Criteria:**
- [ ] Requires an active session (`requireSessionApi`) — unauthenticated request → 401.
- [ ] Wrong current password → 401, password unchanged.
- [ ] New password < 8 chars → 400.
- [ ] Correct current password → updates the hash and calls `destroyOtherSessions` with the current session's cookie token preserved.

**Verify:** `npm test -- change-password --run` → all tests pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/auth/change-password/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionApi } = vi.hoisted(() => ({ requireSessionApi: vi.fn() }));
const { userFindUnique, userUpdate } = vi.hoisted(() => ({ userFindUnique: vi.fn(), userUpdate: vi.fn() }));
const { verifyPassword, hashPassword } = vi.hoisted(() => ({ verifyPassword: vi.fn(), hashPassword: vi.fn() }));
const { destroyOtherSessions } = vi.hoisted(() => ({ destroyOtherSessions: vi.fn() }));
const { cookies } = vi.hoisted(() => ({ cookies: vi.fn() }));

vi.mock("@/lib/auth/requireSession", () => ({ requireSessionApi }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: userFindUnique, update: userUpdate } } }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword, hashPassword }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyOtherSessions,
}));
vi.mock("next/headers", () => ({ cookies }));

import { POST } from "./route";

const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;

beforeEach(() => {
  requireSessionApi.mockReset();
  userFindUnique.mockReset();
  userUpdate.mockReset();
  verifyPassword.mockReset();
  hashPassword.mockReset();
  destroyOtherSessions.mockReset();
  cookies.mockReset();
  cookies.mockResolvedValue({ get: () => ({ value: "current-session-token" }) });
});

describe("POST /api/auth/change-password", () => {
  it("updates the password and invalidates other sessions, keeping the current one", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "oldhash" });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("newhash");
    userUpdate.mockResolvedValue({});

    const res = await POST(req({ currentPassword: "oldpassword1", newPassword: "newpassword1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { passwordHash: "newhash" } });
    expect(destroyOtherSessions).toHaveBeenCalledWith(expect.anything(), "u1", "current-session-token");
  });

  it("rejects the wrong current password with 401 and does not update", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "oldhash" });
    verifyPassword.mockResolvedValue(false);

    const res = await POST(req({ currentPassword: "wrong", newPassword: "newpassword1" }));

    expect(res.status).toBe(401);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a short new password with 400", async () => {
    requireSessionApi.mockResolvedValue({ user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" }, merchantId: "m1" });
    const res = await POST(req({ currentPassword: "oldpassword1", newPassword: "short" }));
    expect(res.status).toBe(400);
  });

  it("propagates the 401 from requireSessionApi when unauthenticated", async () => {
    requireSessionApi.mockRejectedValue(Object.assign(new Error("unauthorized"), { status: 401 }));
    const res = await POST(req({ currentPassword: "x", newPassword: "newpassword1" }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- change-password --run`
Expected: FAIL with "Cannot find module './route'".

- [ ] **Step 3: Implement the route**

Create `src/app/api/auth/change-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { destroyOtherSessions, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = withErrorHandling(async (req: Request) => {
  const { user } = await requireSessionApi();

  const body = await parseJsonBody(req);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new HttpError(401, "unauthorized");

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) throw new HttpError(401, "Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const store = await cookies();
  const currentToken = store.get(SESSION_COOKIE)?.value ?? "";
  await destroyOtherSessions(prisma, user.id, currentToken);

  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- change-password --run`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/change-password/
git commit -m "feat: add authenticated change-password route"
```

---

## Task 6: forgot-password and reset-password pages

**Goal:** Two public pages wired to the routes above, plus a "Forgot password?" link on `/login`.

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/page.tsx`
- Modify: `src/app/login/page.tsx`

**Acceptance Criteria:**
- [ ] `/forgot-password` shows an email form; on submit, replaces the form with a generic "if that email exists, we've sent a link" confirmation (not a redirect) regardless of API response.
- [ ] `/reset-password` reads `token` from the query string, shows new-password + confirm fields, validates client-side (8+ chars, matching), and on success redirects to `/login`.
- [ ] `/login` has a "Forgot password?" link pointing at `/forgot-password`.

**Verify:** Manual check via `npm run dev` — visit `/forgot-password`, submit an email, confirm the confirmation message appears; visit `/reset-password?token=anything`, confirm the form renders.

**Steps:**

- [ ] **Step 1: Create `src/app/forgot-password/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            Z
          </span>
          Zorin
        </a>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-zinc-900">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        <div className="mt-8">
          {submitted ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              If that email exists in our system, we&apos;ve sent a password reset link. Check your inbox.
            </p>
          ) : (
            <AuthForm
              endpoint="/api/auth/forgot-password"
              submitLabel="Send reset link"
              onSuccess={() => setSubmitted(true)}
              fields={[{ name: "email", label: "Email", type: "email", placeholder: "you@store.com" }]}
            />
          )}
        </div>

        <p className="mt-5 text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/reset-password/page.tsx`**

```tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      window.location.href = "/login?reset=success";
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  if (token === "") {
    return (
      <p className="text-sm text-zinc-500">
        This reset link is missing a token.{" "}
        <Link href="/forgot-password" className="font-medium text-zinc-900 underline underline-offset-4">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm text-zinc-500">New password (8+ characters)</span>
        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-500">Confirm new password</span>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Please wait…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            Z
          </span>
          Zorin
        </a>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-zinc-900">Set a new password</h1>

        <div className="mt-8">
          <Suspense fallback={null}>
            <ResetPasswordInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the "Forgot password?" link to `src/app/login/page.tsx`**

In `src/app/login/page.tsx`, the `AuthForm` block currently ends at line 231 (`</div>` closing `mt-8`) followed by the "No account?" paragraph at line 233. Add a link directly below the form and above that paragraph:

```tsx
          <div className="mt-8">
            <AuthForm
              endpoint="/api/auth/login"
              submitLabel="Log in"
              fields={[
                { name: "email", label: "Email", type: "email", placeholder: "you@store.com" },
                { name: "password", label: "Password", type: "password" },
              ]}
            />
          </div>

          <p className="mt-3 text-sm text-zinc-500">
            <Link href="/forgot-password" className="font-medium text-zinc-900 underline underline-offset-4">
              Forgot password?
            </Link>
          </p>

          <p className="mt-5 text-sm text-zinc-500">
            No account?{" "}
            <Link href="/signup" className="font-medium text-zinc-900 underline underline-offset-4">
              Sign up free
            </Link>
          </p>
```

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, then:
- Visit `http://localhost:3000/forgot-password`, submit any email, confirm the form is replaced by the confirmation message.
- Visit `http://localhost:3000/reset-password?token=anything`, confirm the new-password form renders (it will fail on submit since the token is fake — that's expected, confirmed by Task 4's tests).
- Visit `http://localhost:3000/login`, confirm the "Forgot password?" link is present and navigates correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/forgot-password/ src/app/reset-password/ src/app/login/page.tsx
git commit -m "feat: add forgot-password and reset-password pages"
```

---

## Task 7: ChangePasswordCard on Settings

**Goal:** An authenticated change-password form, added to `/settings` next to `BillingCard`.

**Files:**
- Create: `src/components/ChangePasswordCard.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] Card has current-password, new-password, and confirm-password fields.
- [ ] Client-side validation: new password 8+ chars, must match confirm — shown as an error without hitting the API.
- [ ] Successful submit clears the fields and shows a success message.
- [ ] Failed submit (e.g. wrong current password) shows the API's error message and does not clear the fields.
- [ ] Rendered on `/settings` below `BillingCard`.

**Verify:** Manual check via `npm run dev` — log in, visit `/settings`, submit the wrong current password (see the error), then the correct one (see the success message and confirm re-login still works with the new password).

**Steps:**

- [ ] **Step 1: Create `src/components/ChangePasswordCard.tsx`**

```tsx
"use client";
import { useState } from "react";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setBusy(false);
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Change password</h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">Current password</span>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="field mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">New password (8+ characters)</span>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="field mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Confirm new password</span>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field mt-1 w-full"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {success && <p className="text-sm text-positive">Password changed.</p>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Saving…" : "Change password"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `src/app/settings/page.tsx`**

```tsx
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";
import { BillingCard } from "@/components/BillingCard";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

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
          <ChangePasswordCard />
          <ShopifyConnectionCard />
          <WooCommerceConnectionCard />
        </div>
      </main>
    </AppShell>
  );
}
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`, log in with the seeded demo account (`demo@priceiq.example` / `demo1234`), visit `/settings`:
- Submit the wrong current password → see the error message, fields not cleared.
- Submit the correct current password with a new one → see "Password changed.", fields cleared.
- Log out, log back in with the new password to confirm it actually took effect.
- (Optional but recommended) Confirm other sessions were invalidated: log in from a second browser/incognito window first, change the password from the first, then confirm the second browser's session is now logged out on its next request.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChangePasswordCard.tsx src/app/settings/page.tsx
git commit -m "feat: add change-password card to Settings"
```

---

## Self-Review

**Spec coverage:**
- Forgot-password flow (request → email → reset) → Tasks 1–4, 6.
- Change-password flow (authenticated) → Tasks 1, 5, 7.
- Hashed-at-rest token, 1-hour expiry, single-token-per-user → Task 2.
- No account enumeration → Task 3.
- Origin-derived reset link → Task 3.
- Session invalidation (all on reset, others-only on change) → Tasks 1, 4, 5.
- Dual schema update → Task 1.
- Testing per the existing route-test convention → every task with an API route.
- Out-of-scope items (email verification, multi-user, CAPTCHA) — correctly not covered by any task.

**Placeholder scan:** No TBDs; every step has complete, runnable code and exact commands.

**Type consistency:** `createPasswordResetToken(prisma, userId): Promise<string>` and `consumePasswordResetToken(prisma, rawToken): Promise<{ userId: string } | null>` (Task 2) are used identically in Tasks 3 and 4. `destroyAllSessions`/`destroyOtherSessions` (Task 1) match their usage in Tasks 4 and 5. `SESSION_COOKIE` export already exists in `session.ts` (confirmed via `login/route.ts`'s existing usage pattern) and is reused as-is in Task 5.
