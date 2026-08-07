# Multi-User Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant (Owner) invite teammates by email to join their existing account as Members, with full product/pricing/settings access except billing and team management.

**Architecture:** `User.merchantId` stops being unique (many Users per Merchant) and gains a `role` column (`"OWNER" | "MEMBER"`). A new `Invitation` model (hashed token, 7-day expiry — same shape as the existing `PasswordResetToken`) drives an email-invite flow: the Owner sends an invite from a new `TeamCard.tsx` on `/settings`, the recipient lands on a public `/invite/[token]` page (modeled on `/survey/[token]`), sets a password, and a new `User` row is created attached to the *existing* merchant. Because every merchant-scoped API route already filters by `merchantId` (not `userId`), the ~61 existing routes need zero changes — the only new permission surface is a small `requireOwnerApi()` guard on the handful of routes (invite, remove, revoke, resend) that must stay Owner-only.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, Vitest 4, Resend (email) — same stack and conventions used throughout this codebase (`withErrorHandling`/`HttpError`, `requireSessionApi`, `parseJsonBody`, the hashed-token pattern from `resetToken.ts`).

**User decisions (already made):**
- Scope: one team on one store. No multi-merchant switching for a single login — an invite to an email that already has a Zorin account anywhere is rejected. See design doc `docs/superpowers/specs/2026-08-08-multi-user-teams-design.md`.
- Roles: Owner + Member only, no Admin tier. Members get full access except billing and team management.
- Invite flow: email invite link (reusing the existing Resend setup), not owner-set-password-directly.
- No seat limits or seat-based billing for this version — unlimited teammates on any paid plan.
- Invite UI: no role picker at invite time (every invite creates a Member). Team management lives as a new card on the existing single-page `/settings`, not a new sidebar/sub-pages layout.
- Removal: both Owner-removes-Member and Member-leaves-voluntarily are supported; either destroys that user's sessions immediately. No ownership transfer in this version — the Owner can neither leave nor be removed.

---

## Task 1: Schema — role, drop unique, Invitation model

**Goal:** Add the data model this feature depends on.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`

**Acceptance Criteria:**
- [ ] `User.merchantId` is no longer `@unique` — a Merchant can have many Users
- [ ] `User.role` exists as `String @default("OWNER")` — existing rows backfill to `"OWNER"` automatically
- [ ] `Merchant.user User?` becomes `Merchant.users User[]`
- [ ] New `Invitation` model exists with `merchantId` (relation, cascade delete), `email`, unique `tokenHash`, `invitedByUserId`, `expiresAt`, nullable `acceptedAt`, `createdAt`
- [ ] Both schema files stay in sync (only the `datasource` block differs)

**Verify:** `npx prisma db push && npx prisma generate` → "Your database is now in sync with your Prisma schema", no errors

**Steps:**

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In the `Merchant` model, replace:

```prisma
  user                  User?
```

with:

```prisma
  users                 User[]
  invitations           Invitation[]
```

In the `User` model, replace:

```prisma
  merchantId          String               @unique
  merchant            Merchant             @relation(fields: [merchantId], references: [id])
```

with:

```prisma
  merchantId          String
  role                String               @default("OWNER") // "OWNER" | "MEMBER"
  merchant            Merchant             @relation(fields: [merchantId], references: [id])
```

Add a new model anywhere in the file (e.g. after `PasswordResetToken`):

```prisma
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

- [ ] **Step 2: Apply the identical model additions to `prisma/schema.production.prisma`** (same `Merchant.users`/`Merchant.invitations` lines, same `User.merchantId`/`User.role` change, same new `Invitation` model — only the top-level `datasource` block differs between the two files).

- [ ] **Step 3: Push schema and regenerate the client**

```bash
cd /c/Users/pohde/projects/zorin
npx prisma db push
npx prisma generate
```

Expected: "Your database is now in sync with your Prisma schema" with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/schema.production.prisma
git commit -m "feat: add User.role and Invitation model for multi-user teams"
```

---

## Task 2: Session layer — role support + requireOwnerApi()

**Goal:** Make `role` a first-class part of the session, and add an Owner-only guard for the routes that need it.

**Files:**
- Modify: `src/lib/auth/session.ts`
- Modify: `src/lib/auth/session.test.ts`
- Modify: `src/lib/auth/requireSession.ts`
- Modify: `src/lib/auth/requireSession.test.ts`

**Acceptance Criteria:**
- [ ] `SessionUser` includes `role: "OWNER" | "MEMBER"`, sourced the same way `merchantId` already is
- [ ] `requireOwnerApi()` returns the session when `role === "OWNER"`, throws `HttpError(403, ...)` otherwise
- [ ] `requireOwnerApi()` throws `HttpError(401, ...)` when unauthenticated (same as `requireSessionApi()`, since it's built on top of it)
- [ ] All existing `session.test.ts`/`requireSession.test.ts` cases still pass with the fixture updated to include `role`

**Verify:** `npm test -- src/lib/auth/session.test.ts src/lib/auth/requireSession.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Update the failing/changed tests first**

In `src/lib/auth/session.test.ts`, change the `getSessionUser` describe block's fixture and expectations:

```typescript
describe("getSessionUser", () => {
  const user = { id: "u1", email: "d@e.f", merchantId: "m1", role: "OWNER" };

  it("returns the user for a live session", async () => {
    findUnique.mockResolvedValue({
      token: "t",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    await expect(getSessionUser(prisma, "t")).resolves.toEqual(user);
  });
  // ...(the other three cases in this describe block are unchanged)
});
```

In `src/lib/auth/requireSession.test.ts`, change the shared fixture at the top of the file:

```typescript
const user = { id: "u1", email: "d@e.f", merchantId: "m1", role: "OWNER" };
```

Add a new describe block at the end of the file:

```typescript
describe("requireOwnerApi", () => {
  it("returns the session when the user is OWNER", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    getSessionUser.mockResolvedValue(user);
    await expect(requireOwnerApi()).resolves.toEqual({ user, merchantId: "m1" });
  });

  it("throws HttpError 403 when the user is MEMBER", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    getSessionUser.mockResolvedValue({ ...user, role: "MEMBER" });
    await expect(requireOwnerApi()).rejects.toMatchObject(
      new HttpError(403, "Owner access required"),
    );
  });

  it("throws HttpError 401 when unauthenticated", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(requireOwnerApi()).rejects.toMatchObject(
      new HttpError(401, "unauthorized"),
    );
  });
});
```

Add `requireOwnerApi` to the import line at the top of the file:

```typescript
import { getSession, requireSessionApi, requireSessionPage, requireOwnerApi } from "./requireSession";
```

- [ ] **Step 2: Run to confirm the new/changed tests fail**

```bash
npm test -- src/lib/auth/session.test.ts src/lib/auth/requireSession.test.ts
```

Expected: FAIL — `role` missing from `getSessionUser`'s return, `requireOwnerApi` doesn't exist yet.

- [ ] **Step 3: Add `role` to `SessionUser` and `getSessionUser` in `src/lib/auth/session.ts`**

Replace the `SessionUser` interface:

```typescript
export type UserRole = "OWNER" | "MEMBER";

export interface SessionUser {
  id: string;
  email: string;
  merchantId: string;
  role: UserRole;
}
```

In `getSessionUser`, replace:

```typescript
  const { id, email, merchantId } = session.user;
  return { id, email, merchantId };
```

with:

```typescript
  const { id, email, merchantId, role } = session.user;
  return { id, email, merchantId, role: role as UserRole };
```

- [ ] **Step 4: Add `requireOwnerApi()` to `src/lib/auth/requireSession.ts`**

Add after the existing `requireSessionApi` function:

```typescript
// Like requireSessionApi, but also requires the caller to be the account
// Owner. Use for routes that manage billing or team membership — everything
// else stays open to any authenticated Member, scoped by merchantId as usual.
export async function requireOwnerApi(): Promise<SessionInfo> {
  const session = await requireSessionApi();
  if (session.user.role !== "OWNER") {
    throw new HttpError(403, "Owner access required");
  }
  return session;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- src/lib/auth/session.test.ts src/lib/auth/requireSession.test.ts
```

Expected: PASS (all cases, including the three new `requireOwnerApi` cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts src/lib/auth/requireSession.ts src/lib/auth/requireSession.test.ts
git commit -m "feat: add role to session and requireOwnerApi() guard"
```

---

## Task 3: Invitation business logic library

**Goal:** Token creation/validation/listing logic for invitations, independent of any route — mirrors `resetToken.ts`'s shape and test style.

**Files:**
- Create: `src/lib/team/invitation.ts`
- Test: `src/lib/team/invitation.test.ts`

**Acceptance Criteria:**
- [ ] `createInvitation()` generates a 64-hex-char raw token, stores only its SHA-256 hash, sets a 7-day expiry, and deletes any existing *pending* invitation for the same `(merchantId, email)` pair first (so re-inviting or resending never leaves two live tokens for the same person)
- [ ] `findValidInvitation()` returns `null` for an unknown token, an already-accepted invitation, or an expired one — same "don't distinguish the reason" posture as `consumePasswordResetToken`
- [ ] `markInvitationAccepted()` sets `acceptedAt` to now
- [ ] `revokeInvitation()` deletes a pending invitation scoped by `merchantId`, throwing `HttpError(404, ...)` if it doesn't exist or doesn't belong to that merchant
- [ ] `listTeam()` returns active members (`id`, `email`, `role`, `createdAt`) and pending invitations (`id`, `email`, `expiresAt`, `expired: boolean`) for a merchant

**Verify:** `npm test -- src/lib/team/invitation.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/team/invitation.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createInvitation,
  findValidInvitation,
  markInvitationAccepted,
  revokeInvitation,
  listTeam,
  INVITE_TOKEN_TTL_MS,
} from "./invitation";
import { HttpError } from "@/lib/api/errors";

const create = vi.fn();
const findUnique = vi.fn();
const deleteMany = vi.fn();
const update = vi.fn();
const findMany = vi.fn();
const prisma = {
  invitation: { create, findUnique, deleteMany, update, findMany },
  user: { findMany },
} as unknown as PrismaClient;

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  deleteMany.mockReset();
  update.mockReset();
  findMany.mockReset();
});

describe("createInvitation", () => {
  it("returns a 64-hex-char raw token, stores its hash (not the raw value), with a ~7 day expiry", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    create.mockResolvedValue({ id: "inv1", email: "teammate@example.com", expiresAt: new Date() });
    const before = Date.now();

    const { token, invitation } = await createInvitation(prisma, {
      merchantId: "m1",
      email: "teammate@example.com",
      invitedByUserId: "u1",
    });

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(invitation.id).toBe("inv1");
    const createArgs = create.mock.calls[0][0];
    expect(createArgs.data.tokenHash).not.toBe(token);
    expect(createArgs.data.merchantId).toBe("m1");
    expect(createArgs.data.email).toBe("teammate@example.com");
    expect(createArgs.data.invitedByUserId).toBe("u1");
    expect(createArgs.data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + INVITE_TOKEN_TTL_MS - 1000);
  });

  it("deletes any existing pending invitation for the same merchant+email before creating a new one", async () => {
    const order: string[] = [];
    deleteMany.mockImplementation(async () => { order.push("deleteMany"); return { count: 1 }; });
    create.mockImplementation(async () => { order.push("create"); return { id: "inv2", email: "teammate@example.com", expiresAt: new Date() }; });

    await createInvitation(prisma, { merchantId: "m1", email: "teammate@example.com", invitedByUserId: "u1" });

    expect(order).toEqual(["deleteMany", "create"]);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { merchantId: "m1", email: "teammate@example.com", acceptedAt: null },
    });
  });
});

describe("findValidInvitation", () => {
  it("returns the invitation for a valid, unexpired, unaccepted token", async () => {
    findUnique.mockResolvedValue({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(findValidInvitation(prisma, "raw-token")).resolves.toEqual({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
    });
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    await expect(findValidInvitation(prisma, "nope")).resolves.toBeNull();
  });

  it("returns null for an already-accepted invitation", async () => {
    findUnique.mockResolvedValue({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(findValidInvitation(prisma, "raw-token")).resolves.toBeNull();
  });

  it("returns null for an expired invitation", async () => {
    findUnique.mockResolvedValue({
      id: "inv1",
      merchantId: "m1",
      email: "teammate@example.com",
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(findValidInvitation(prisma, "raw-token")).resolves.toBeNull();
  });
});

describe("markInvitationAccepted", () => {
  it("sets acceptedAt on the given invitation", async () => {
    update.mockResolvedValue({});
    await markInvitationAccepted(prisma, "inv1");
    expect(update).toHaveBeenCalledWith({ where: { id: "inv1" }, data: { acceptedAt: expect.any(Date) } });
  });
});

describe("revokeInvitation", () => {
  it("deletes a pending invitation scoped by merchantId", async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await revokeInvitation(prisma, "inv1", "m1");
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "inv1", merchantId: "m1", acceptedAt: null } });
  });

  it("throws 404 when nothing matched (wrong merchant, already accepted, or missing)", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(revokeInvitation(prisma, "inv1", "m1")).rejects.toMatchObject(new HttpError(404, "Not found"));
  });
});

describe("listTeam", () => {
  it("returns active members and pending invitations, flagging expired ones", async () => {
    (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: new Date("2026-08-01") },
      { id: "u2", email: "member@example.com", role: "MEMBER", createdAt: new Date("2026-08-05") },
    ]);
    (prisma.invitation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "inv1", email: "pending@example.com", expiresAt: new Date(Date.now() + 60_000) },
      { id: "inv2", email: "stale@example.com", expiresAt: new Date(Date.now() - 60_000) },
    ]);

    const result = await listTeam(prisma, "m1");

    expect(result.members).toEqual([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: new Date("2026-08-01") },
      { id: "u2", email: "member@example.com", role: "MEMBER", createdAt: new Date("2026-08-05") },
    ]);
    expect(result.pendingInvites).toEqual([
      { id: "inv1", email: "pending@example.com", expiresAt: expect.any(Date), expired: false },
      { id: "inv2", email: "stale@example.com", expiresAt: expect.any(Date), expired: true },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { merchantId: "m1" }, orderBy: { createdAt: "asc" } });
    expect(prisma.invitation.findMany).toHaveBeenCalledWith({
      where: { merchantId: "m1", acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/team/invitation.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/team/invitation.ts
import { randomBytes, createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";

// Typed against Prisma.TransactionClient (not PrismaClient) so every
// function here can be called either with the top-level `prisma` singleton
// or with the `tx` passed into a `prisma.$transaction(async (tx) => ...)`
// callback — a real PrismaClient satisfies this narrower shape too, since
// TransactionClient is PrismaClient minus $transaction/$connect/etc.
type Db = Prisma.TransactionClient;

export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateInvitationResult {
  token: string;
  invitation: { id: string; email: string; expiresAt: Date };
}

// One *pending* invitation per (merchant, email) at a time. Creating a new
// one for the same pair deletes any existing pending row first — this same
// function is used for both the initial invite and the explicit "resend"
// action, so resend naturally invalidates the old link.
export async function createInvitation(
  prisma: Db,
  params: { merchantId: string; email: string; invitedByUserId: string },
): Promise<CreateInvitationResult> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

  await prisma.invitation.deleteMany({
    where: { merchantId: params.merchantId, email: params.email, acceptedAt: null },
  });
  const invitation = await prisma.invitation.create({
    data: {
      merchantId: params.merchantId,
      email: params.email,
      tokenHash,
      invitedByUserId: params.invitedByUserId,
      expiresAt,
    },
  });

  return {
    token,
    invitation: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt },
  };
}

export interface ValidInvitation {
  id: string;
  merchantId: string;
  email: string;
}

// Null for not-found, already-accepted, or expired — callers show one
// generic "this invite link is no longer valid" state for all three, same
// no-distinguishing-reasons posture as consumePasswordResetToken.
export async function findValidInvitation(
  prisma: Db,
  rawToken: string,
): Promise<ValidInvitation | null> {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!invitation) return null;
  if (invitation.acceptedAt) return null;
  if (invitation.expiresAt.getTime() <= Date.now()) return null;
  return { id: invitation.id, merchantId: invitation.merchantId, email: invitation.email };
}

export async function markInvitationAccepted(prisma: Db, id: string): Promise<void> {
  await prisma.invitation.update({ where: { id }, data: { acceptedAt: new Date() } });
}

export async function revokeInvitation(prisma: Db, id: string, merchantId: string): Promise<void> {
  const result = await prisma.invitation.deleteMany({
    where: { id, merchantId, acceptedAt: null },
  });
  if (result.count === 0) throw new HttpError(404, "Not found");
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface PendingInvite {
  id: string;
  email: string;
  expiresAt: Date;
  expired: boolean;
}

export async function listTeam(
  prisma: Db,
  merchantId: string,
): Promise<{ members: TeamMember[]; pendingInvites: PendingInvite[] }> {
  const [users, invitations] = await Promise.all([
    prisma.user.findMany({ where: { merchantId }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { merchantId, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const now = Date.now();
  return {
    members: users.map((u) => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt })),
    pendingInvites: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      expiresAt: i.expiresAt,
      expired: i.expiresAt.getTime() <= now,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/team/invitation.test.ts
```

Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/team/invitation.ts src/lib/team/invitation.test.ts
git commit -m "feat: add invitation token business logic"
```

---

## Task 4: Team invite management API (Owner-only) + invite email

**Goal:** Let the Owner invite, list, resend, and revoke teammates.

**Files:**
- Create: `src/lib/email/sendInviteEmail.ts`
- Test: `src/lib/email/sendInviteEmail.test.ts`
- Create: `src/app/api/team/route.ts`
- Test: `src/app/api/team/route.test.ts`
- Create: `src/app/api/team/invite/route.ts`
- Test: `src/app/api/team/invite/route.test.ts`
- Create: `src/app/api/team/invitations/[id]/route.ts`
- Test: `src/app/api/team/invitations/[id]/route.test.ts`
- Create: `src/app/api/team/invitations/[id]/resend/route.ts`
- Test: `src/app/api/team/invitations/[id]/resend/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET /api/team` returns members + pending invitations for the caller's merchant; any authenticated user (Owner or Member) can call it
- [ ] `POST /api/team/invite` (Owner-only) creates an invitation and sends an email; 400 for invalid email, 409 if the email already has a Zorin account, 403 if the caller isn't Owner
- [ ] `DELETE /api/team/invitations/[id]` (Owner-only) revokes a pending invite; 404 if it doesn't belong to the caller's merchant
- [ ] `POST /api/team/invitations/[id]/resend` (Owner-only) reissues the email with a fresh token; the old token stops working
- [ ] `sendInviteEmail()` silently no-ops when `RESEND_API_KEY` is unset, same as every other email helper in this project

**Verify:** `npm test -- src/lib/email/sendInviteEmail.test.ts "src/app/api/team"` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test for `sendInviteEmail`**

```typescript
// src/lib/email/sendInviteEmail.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send } })),
}));

import { sendInviteEmail } from "./sendInviteEmail";

const ORIGINAL_ENV = process.env.RESEND_API_KEY;

beforeEach(() => {
  send.mockReset();
});

afterEach(() => {
  process.env.RESEND_API_KEY = ORIGINAL_ENV;
});

describe("sendInviteEmail", () => {
  it("no-ops when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await sendInviteEmail("teammate@example.com", "Acme Co", "https://tryzorin.com/invite/abc");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends an email with the merchant name and invite link when configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    send.mockResolvedValue({});
    await sendInviteEmail("teammate@example.com", "Acme Co", "https://tryzorin.com/invite/abc");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "teammate@example.com",
        subject: expect.stringContaining("Acme Co"),
        text: expect.stringContaining("https://tryzorin.com/invite/abc"),
      }),
    );
  });
});
```

Add `import { afterEach } from "vitest";` to the existing `vitest` import line at the top.

- [ ] **Step 2: Run to confirm it fails, then write `sendInviteEmail.ts`**

```typescript
// src/lib/email/sendInviteEmail.ts
import { Resend } from "resend";

export async function sendInviteEmail(to: string, merchantName: string, inviteUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Zorin <onboarding@resend.dev>",
    to,
    subject: `${merchantName} invited you to Zorin`,
    text: [
      `You've been invited to join ${merchantName} on Zorin.`,
      "",
      "Click the link below to accept. This link expires in 7 days.",
      "",
      inviteUrl,
      "",
      "If you weren't expecting this, you can safely ignore this email.",
    ].join("\n"),
  });
}
```

Run: `npm test -- src/lib/email/sendInviteEmail.test.ts` → expect PASS (2 tests).

- [ ] **Step 3: Commit the email helper**

```bash
git add src/lib/email/sendInviteEmail.ts src/lib/email/sendInviteEmail.test.ts
git commit -m "feat: add sendInviteEmail helper"
```

- [ ] **Step 4: Write the failing test for `GET /api/team`**

```typescript
// src/app/api/team/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany: userFindMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
const { findMany: invitationFindMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: userFindMany },
    invitation: { findMany: invitationFindMany },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));

import { GET } from "./route";

beforeEach(() => {
  userFindMany.mockReset();
  invitationFindMany.mockReset();
});

describe("GET /api/team", () => {
  it("returns members and pending invitations for the caller's merchant", async () => {
    userFindMany.mockResolvedValue([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: new Date("2026-08-01") },
    ]);
    invitationFindMany.mockResolvedValue([
      { id: "inv1", email: "teammate@example.com", expiresAt: new Date(Date.now() + 60_000) },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toEqual([
      { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: "2026-08-01T00:00:00.000Z" },
    ]);
    expect(body.pendingInvites[0]).toMatchObject({ id: "inv1", email: "teammate@example.com", expired: false });
  });
});
```

- [ ] **Step 5: Run to confirm it fails, then write `src/app/api/team/route.ts`**

```typescript
// src/app/api/team/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { listTeam } from "@/lib/team/invitation";

export const GET = withErrorHandling(async () => {
  const session = await requireSessionApi();
  const team = await listTeam(prisma, session.merchantId);

  return NextResponse.json({
    members: team.members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    pendingInvites: team.pendingInvites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
  });
});
```

Run: `npm test -- src/app/api/team/route.test.ts` → expect PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/team/route.ts src/app/api/team/route.test.ts
git commit -m "feat: add GET /api/team list endpoint"
```

- [ ] **Step 7: Write the failing test for `POST /api/team/invite`**

```typescript
// src/app/api/team/invite/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique: userFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { findUnique: merchantFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { createInvitation } = vi.hoisted(() => ({ createInvitation: vi.fn() }));
const { sendInviteEmail } = vi.hoisted(() => ({ sendInviteEmail: vi.fn(async () => undefined) }));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    merchant: { findUnique: merchantFindUnique },
  },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));

vi.mock("@/lib/team/invitation", () => ({ createInvitation }));
vi.mock("@/lib/email/sendInviteEmail", () => ({ sendInviteEmail }));

import { POST } from "./route";

const reqWith = (body: unknown) =>
  ({ json: async () => body, url: "https://tryzorin.com/api/team/invite" }) as unknown as Request;

beforeEach(() => {
  userFindUnique.mockReset();
  merchantFindUnique.mockReset();
  createInvitation.mockReset();
  sendInviteEmail.mockClear();
});

describe("POST /api/team/invite", () => {
  it("returns 400 for an invalid email", async () => {
    const res = await POST(reqWith({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("returns 409 when the email already has a Zorin account", async () => {
    userFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(reqWith({ email: "taken@example.com" }));
    expect(res.status).toBe(409);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("creates an invitation and sends the email", async () => {
    userFindUnique.mockResolvedValue(null);
    merchantFindUnique.mockResolvedValue({ name: "Acme Co" });
    createInvitation.mockResolvedValue({
      token: "raw-token",
      invitation: { id: "inv1", email: "teammate@example.com", expiresAt: new Date() },
    });

    const res = await POST(reqWith({ email: "teammate@example.com" }));

    expect(res.status).toBe(200);
    expect(createInvitation).toHaveBeenCalledWith(expect.anything(), {
      merchantId: "m1",
      email: "teammate@example.com",
      invitedByUserId: "u1",
    });
    expect(sendInviteEmail).toHaveBeenCalledWith(
      "teammate@example.com",
      "Acme Co",
      "https://tryzorin.com/invite/raw-token",
    );
  });
});
```

- [ ] **Step 8: Run to confirm it fails, then write `src/app/api/team/invite/route.ts`**

```typescript
// src/app/api/team/invite/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";
import { createInvitation } from "@/lib/team/invitation";
import { sendInviteEmail } from "@/lib/email/sendInviteEmail";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireOwnerApi();
  const body = await parseJsonBody(req);
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(rawEmail)) throw new HttpError(400, "Invalid email address");
  const email = normalizeEmail(rawEmail);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new HttpError(409, "This email already has a Zorin account");

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.merchantId },
    select: { name: true },
  });

  const { token } = await createInvitation(prisma, {
    merchantId: session.merchantId,
    email,
    invitedByUserId: session.user.id,
  });

  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/invite/${token}`;
  sendInviteEmail(email, merchant?.name ?? "your team", inviteUrl).catch((err) => {
    console.error("[team/invite] failed to send invite email:", err);
  });

  return NextResponse.json({ ok: true });
});
```

Run: `npm test -- src/app/api/team/invite/route.test.ts` → expect PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/app/api/team/invite/route.ts src/app/api/team/invite/route.test.ts
git commit -m "feat: add POST /api/team/invite endpoint"
```

- [ ] **Step 10: Write the failing test for revoke + resend**

```typescript
// src/app/api/team/invitations/[id]/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/api/errors";

const { revokeInvitation } = vi.hoisted(() => ({ revokeInvitation: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));
vi.mock("@/lib/team/invitation", () => ({ revokeInvitation }));

import { DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  revokeInvitation.mockReset();
});

describe("DELETE /api/team/invitations/[id]", () => {
  it("revokes the invitation, scoped to the caller's merchant", async () => {
    revokeInvitation.mockResolvedValue(undefined);
    const res = await DELETE(undefined as unknown as Request, ctx("inv1"));
    expect(res.status).toBe(200);
    expect(revokeInvitation).toHaveBeenCalledWith(expect.anything(), "inv1", "m1");
  });

  it("propagates a 404 when the invitation doesn't belong to this merchant", async () => {
    revokeInvitation.mockRejectedValue(new HttpError(404, "Not found"));
    const res = await DELETE(undefined as unknown as Request, ctx("inv1"));
    expect(res.status).toBe(404);
  });
});
```

```typescript
// src/app/api/team/invitations/[id]/resend/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
const { findUnique: merchantFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { createInvitation } = vi.hoisted(() => ({ createInvitation: vi.fn() }));
const { sendInviteEmail } = vi.hoisted(() => ({ sendInviteEmail: vi.fn(async () => undefined) }));

vi.mock("@/lib/db", () => ({
  prisma: {
    invitation: { findFirst },
    merchant: { findUnique: merchantFindUnique },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));
vi.mock("@/lib/team/invitation", () => ({ createInvitation }));
vi.mock("@/lib/email/sendInviteEmail", () => ({ sendInviteEmail }));

import { POST } from "./route";

const req = () => ({ url: "https://tryzorin.com/api/team/invitations/inv1/resend" }) as unknown as Request;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  findFirst.mockReset();
  merchantFindUnique.mockReset();
  createInvitation.mockReset();
  sendInviteEmail.mockClear();
});

describe("POST /api/team/invitations/[id]/resend", () => {
  it("returns 404 when the pending invitation doesn't belong to this merchant", async () => {
    findFirst.mockResolvedValue(null);
    const res = await POST(req(), ctx("inv1"));
    expect(res.status).toBe(404);
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("issues a fresh invitation for the same email and re-sends", async () => {
    findFirst.mockResolvedValue({ id: "inv1", email: "teammate@example.com" });
    merchantFindUnique.mockResolvedValue({ name: "Acme Co" });
    createInvitation.mockResolvedValue({
      token: "fresh-token",
      invitation: { id: "inv2", email: "teammate@example.com", expiresAt: new Date() },
    });

    const res = await POST(req(), ctx("inv1"));

    expect(res.status).toBe(200);
    expect(createInvitation).toHaveBeenCalledWith(expect.anything(), {
      merchantId: "m1",
      email: "teammate@example.com",
      invitedByUserId: "u1",
    });
    expect(sendInviteEmail).toHaveBeenCalledWith(
      "teammate@example.com",
      "Acme Co",
      "https://tryzorin.com/invite/fresh-token",
    );
  });
});
```

- [ ] **Step 11: Run to confirm both fail, then write the two routes**

```typescript
// src/app/api/team/invitations/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { revokeInvitation } from "@/lib/team/invitation";

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireOwnerApi();
    const { id } = await params;
    await revokeInvitation(prisma, id, session.merchantId);
    return NextResponse.json({ ok: true });
  },
);
```

```typescript
// src/app/api/team/invitations/[id]/resend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { createInvitation } from "@/lib/team/invitation";
import { sendInviteEmail } from "@/lib/email/sendInviteEmail";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireOwnerApi();
    const { id } = await params;

    const existing = await prisma.invitation.findFirst({
      where: { id, merchantId: session.merchantId, acceptedAt: null },
    });
    if (!existing) throw new HttpError(404, "Not found");

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: { name: true },
    });

    // createInvitation deletes any existing pending row for this
    // (merchantId, email) first — so this call alone both revokes the old
    // token and issues a fresh one.
    const { token } = await createInvitation(prisma, {
      merchantId: session.merchantId,
      email: existing.email,
      invitedByUserId: session.user.id,
    });

    const origin = new URL(req.url).origin;
    const inviteUrl = `${origin}/invite/${token}`;
    sendInviteEmail(existing.email, merchant?.name ?? "your team", inviteUrl).catch((err) => {
      console.error("[team/invitations/resend] failed to send invite email:", err);
    });

    return NextResponse.json({ ok: true });
  },
);
```

Run: `npm test -- "src/app/api/team/invitations"` → expect PASS (4 tests).

- [ ] **Step 12: Commit**

```bash
git add src/app/api/team/invitations
git commit -m "feat: add invitation revoke and resend endpoints"
```

---

## Task 5: Public invite accept flow

**Goal:** Let an invited person resolve their invite link, see which store they're joining, set a password, and land in the app.

**Files:**
- Create: `src/app/api/invite/[token]/route.ts`
- Test: `src/app/api/invite/[token]/route.test.ts`
- Create: `src/app/api/invite/[token]/accept/route.ts`
- Test: `src/app/api/invite/[token]/accept/route.test.ts`
- Create: `src/app/invite/[token]/page.tsx`

**Acceptance Criteria:**
- [ ] `GET /api/invite/[token]` returns `{ merchantName, email }` for a valid token, 404 for invalid/expired/already-accepted
- [ ] `POST /api/invite/[token]/accept` creates a `User` (`role: "MEMBER"`, the invitation's `merchantId`), marks the invitation accepted, creates a session, and sets the session cookie; 404 for invalid/expired/already-accepted, 400 for a password under 8 characters, 409 if the email was claimed by someone else in the meantime
- [ ] `/invite/[token]` renders a loading → not-found/expired → ready → submitting → done state machine (same shape as `/survey/[token]`), shows the merchant name, and redirects to `/dashboard` on success

**Verify:** `npm test -- "src/app/api/invite"` → all pass; manual check of the page in the browser

**Steps:**

- [ ] **Step 1: Write the failing test for the resolve endpoint**

```typescript
// src/app/api/invite/[token]/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findValidInvitation } = vi.hoisted(() => ({ findValidInvitation: vi.fn() }));
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { merchant: { findUnique } } }));
vi.mock("@/lib/team/invitation", () => ({ findValidInvitation }));

import { GET } from "./route";

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

beforeEach(() => {
  findValidInvitation.mockReset();
  findUnique.mockReset();
});

describe("GET /api/invite/[token]", () => {
  it("returns 404 for an invalid token", async () => {
    findValidInvitation.mockResolvedValue(null);
    const res = await GET(undefined as unknown as Request, ctx("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns the merchant name and invited email for a valid token", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    findUnique.mockResolvedValue({ name: "Acme Co" });
    const res = await GET(undefined as unknown as Request, ctx("good-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ merchantName: "Acme Co", email: "teammate@example.com" });
  });
});
```

- [ ] **Step 2: Run to confirm it fails, then write `src/app/api/invite/[token]/route.ts`**

```typescript
// src/app/api/invite/[token]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { findValidInvitation } from "@/lib/team/invitation";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const invitation = await findValidInvitation(prisma, token);
    if (!invitation) throw new HttpError(404, "This invite link is invalid or has expired");

    const merchant = await prisma.merchant.findUnique({
      where: { id: invitation.merchantId },
      select: { name: true },
    });

    return NextResponse.json({ merchantName: merchant?.name ?? "", email: invitation.email });
  },
);
```

Run: `npm test -- src/app/api/invite/\[token\]/route.test.ts` → expect PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/invite/[token]/route.ts" "src/app/api/invite/[token]/route.test.ts"
git commit -m "feat: add GET /api/invite/[token] resolve endpoint"
```

- [ ] **Step 4: Write the failing test for the accept endpoint**

```typescript
// src/app/api/invite/[token]/accept/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findValidInvitation, markInvitationAccepted } = vi.hoisted(() => ({
  findValidInvitation: vi.fn(),
  markInvitationAccepted: vi.fn(async () => undefined),
}));
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
const { $transaction } = vi.hoisted(() => ({
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ user: { create: vi.fn(async () => ({ id: "u2" })) } })),
}));
const { createSession, setSessionCookie } = vi.hoisted(() => ({
  createSession: vi.fn(async () => ({ token: "session-token", expiresAt: new Date() })),
  setSessionCookie: vi.fn(),
}));
const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn(async () => "hashed") }));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique }, $transaction },
}));
vi.mock("@/lib/team/invitation", () => ({ findValidInvitation, markInvitationAccepted }));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
  setSessionCookie,
}));

import { POST } from "./route";

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
const reqWith = (body: unknown) => ({ json: async () => body }) as unknown as Request;

beforeEach(() => {
  findValidInvitation.mockReset();
  markInvitationAccepted.mockClear();
  findUnique.mockReset();
  $transaction.mockClear();
  createSession.mockClear();
  setSessionCookie.mockClear();
  hashPassword.mockClear();
});

describe("POST /api/invite/[token]/accept", () => {
  it("returns 404 for an invalid/expired token", async () => {
    findValidInvitation.mockResolvedValue(null);
    const res = await POST(reqWith({ password: "longenough" }), ctx("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns 400 for a password under 8 characters", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    const res = await POST(reqWith({ password: "short" }), ctx("good-token"));
    expect(res.status).toBe(400);
  });

  it("returns 409 if the email was claimed by someone else since the invite was sent", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    findUnique.mockResolvedValue({ id: "already-exists" });
    const res = await POST(reqWith({ password: "longenough" }), ctx("good-token"));
    expect(res.status).toBe(409);
  });

  it("creates the user, marks the invitation accepted, and starts a session", async () => {
    findValidInvitation.mockResolvedValue({ id: "inv1", merchantId: "m1", email: "teammate@example.com" });
    findUnique.mockResolvedValue(null);

    const res = await POST(reqWith({ password: "longenough" }), ctx("good-token"));

    expect(res.status).toBe(200);
    expect(hashPassword).toHaveBeenCalledWith("longenough");
    expect($transaction).toHaveBeenCalled();
    expect(markInvitationAccepted).toHaveBeenCalledWith(expect.anything(), "inv1");
    expect(createSession).toHaveBeenCalledWith(expect.anything(), "u2");
    expect(setSessionCookie).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run to confirm it fails, then write `src/app/api/invite/[token]/accept/route.ts`**

```typescript
// src/app/api/invite/[token]/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { findValidInvitation, markInvitationAccepted } from "@/lib/team/invitation";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const invitation = await findValidInvitation(prisma, token);
    if (!invitation) throw new HttpError(404, "This invite link is invalid or has expired");

    const body = await parseJsonBody(req);
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

    // Re-check at accept time — the invite may have sat in an inbox long
    // enough for the same email to sign up independently in the meantime.
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) throw new HttpError(409, "An account with this email already exists");

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          merchantId: invitation.merchantId,
          role: "MEMBER",
        },
      });
      await markInvitationAccepted(tx, invitation.id);
      return created;
    });

    const { token: sessionToken, expiresAt } = await createSession(prisma, user.id);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, sessionToken, expiresAt);
    return res;
  },
);
```

Run: `npm test -- src/app/api/invite/\[token\]/accept/route.test.ts` → expect PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/invite/[token]/accept"
git commit -m "feat: add POST /api/invite/[token]/accept endpoint"
```

- [ ] **Step 7: Write the public accept page**

```tsx
// src/app/invite/[token]/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";

interface InviteInfo {
  merchantName: string;
  email: string;
}

type Status = "loading" | "not-found" | "ready" | "submitting" | "error";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [status, setStatus] = useState<Status>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === "loading" && invite === null) {
    fetch(`/api/invite/${token}`)
      .then((res) => {
        if (!res.ok) {
          setStatus("not-found");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setInvite(data);
          setStatus("ready");
        }
      })
      .catch(() => setStatus("not-found"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        setStatus("ready");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setErrorMessage("Network error — please try again.");
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Loading invite...
        </p>
      </main>
    );
  }

  if (status === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Invite not found</h1>
          <p className="mt-2 text-sm text-muted">
            This invite link is invalid or has expired. Ask whoever invited you to send a new one.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  // status is "ready" or "submitting"
  const submitting = status === "submitting";

  return (
    <main className="flex min-h-screen justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Team invite</p>
          <h1 className="mt-1 text-lg font-semibold text-ink">Join {invite?.merchantName} on Zorin</h1>
          <p className="mt-2 text-sm text-muted">
            Set a password for {invite?.email} to finish joining.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-muted">Password (8+ characters)</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-1 w-full"
                disabled={submitting}
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Confirm password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field mt-1 w-full"
                disabled={submitting}
              />
            </label>

            {errorMessage && (
              <p role="alert" className="text-sm text-danger">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              <span role="status" aria-live="polite">
                {submitting ? "Joining..." : "Join team"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Manually verify in the browser**

Start the dev server. Use the demo account (or a fresh signup) to send yourself an invite via a temporary `curl` call to `POST /api/team/invite` (Task 4's route — the UI for this lands in Task 7), copy the `inviteUrl` logged/returned, open `/invite/<token>` in an incognito window, confirm the merchant name and email render, set a password, confirm it redirects to `/dashboard` logged in as the new user. Re-visit the same `/invite/<token>` URL and confirm it now shows "Invite not found" (already accepted).

- [ ] **Step 9: Commit**

```bash
git add "src/app/invite/[token]/page.tsx"
git commit -m "feat: add public invite accept page"
```

---

## Task 6: Remove and leave

**Goal:** Let the Owner remove a Member, and let a Member leave voluntarily — either way, that user's access is revoked immediately.

**Files:**
- Create: `src/app/api/team/[userId]/route.ts`
- Test: `src/app/api/team/[userId]/route.test.ts`
- Create: `src/app/api/team/leave/route.ts`
- Test: `src/app/api/team/leave/route.test.ts`

**Acceptance Criteria:**
- [ ] `DELETE /api/team/[userId]` (Owner-only): removes a Member, destroys all their sessions first; 404 if the target isn't in the caller's merchant; 400 if the target is the Owner (including the Owner targeting themselves)
- [ ] `POST /api/team/leave`: any Member can call it to remove themselves and destroy their own sessions; 400 if called by the Owner
- [ ] Both clear the session cookie on the response when the caller removed themselves (leave)

**Verify:** `npm test -- "src/app/api/team/[userId]" src/app/api/team/leave` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test for remove**

```typescript
// src/app/api/team/[userId]/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, deleteUser } = vi.hoisted(() => ({ findFirst: vi.fn(), deleteUser: vi.fn() }));
const { destroyAllSessions } = vi.hoisted(() => ({ destroyAllSessions: vi.fn(async () => undefined) }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findFirst, delete: deleteUser } } }));
vi.mock("@/lib/auth/requireSession", () => ({
  requireOwnerApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "owner1", email: "owner@example.com", merchantId: "m1", role: "OWNER" },
  })),
}));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyAllSessions,
}));

import { DELETE } from "./route";

const ctx = (userId: string) => ({ params: Promise.resolve({ userId }) });

beforeEach(() => {
  findFirst.mockReset();
  deleteUser.mockReset();
  destroyAllSessions.mockClear();
});

describe("DELETE /api/team/[userId]", () => {
  it("returns 400 when the Owner targets themselves", async () => {
    const res = await DELETE(undefined as unknown as Request, ctx("owner1"));
    expect(res.status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("returns 404 when the target isn't in the caller's merchant", async () => {
    findFirst.mockResolvedValue(null);
    const res = await DELETE(undefined as unknown as Request, ctx("u2"));
    expect(res.status).toBe(404);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("destroys the target's sessions and removes them", async () => {
    findFirst.mockResolvedValue({ id: "u2", merchantId: "m1", role: "MEMBER" });
    deleteUser.mockResolvedValue({});
    const res = await DELETE(undefined as unknown as Request, ctx("u2"));
    expect(res.status).toBe(200);
    expect(destroyAllSessions).toHaveBeenCalledWith(expect.anything(), "u2");
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "u2" } });
  });
});
```

- [ ] **Step 2: Run to confirm it fails, then write `src/app/api/team/[userId]/route.ts`**

```typescript
// src/app/api/team/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { destroyAllSessions } from "@/lib/auth/session";

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await requireOwnerApi();
    const { userId } = await params;

    if (userId === session.user.id) {
      throw new HttpError(400, "The account owner cannot remove themselves");
    }

    const target = await prisma.user.findFirst({ where: { id: userId, merchantId: session.merchantId } });
    if (!target) throw new HttpError(404, "Not found");

    await destroyAllSessions(prisma, userId);
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  },
);
```

Run: `npm test -- "src/app/api/team/[userId]/route.test.ts"` → expect PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/team/[userId]"
git commit -m "feat: add DELETE /api/team/[userId] remove-member endpoint"
```

- [ ] **Step 4: Write the failing test for leave**

```typescript
// src/app/api/team/leave/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteUser } = vi.hoisted(() => ({ deleteUser: vi.fn() }));
const { destroyAllSessions, SESSION_COOKIE } = vi.hoisted(() => ({
  destroyAllSessions: vi.fn(async () => undefined),
  SESSION_COOKIE: "zorin_session",
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { delete: deleteUser } } }));

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroyAllSessions,
}));

async function mockSessionRole(role: string) {
  vi.doMock("@/lib/auth/requireSession", () => ({
    requireSessionApi: vi.fn(async () => ({
      merchantId: "m1",
      user: { id: "u2", email: "member@example.com", merchantId: "m1", role },
    })),
  }));
  vi.resetModules();
  return await import("./route");
}

beforeEach(() => {
  deleteUser.mockReset();
  destroyAllSessions.mockClear();
});

describe("POST /api/team/leave", () => {
  it("returns 400 when the Owner tries to leave", async () => {
    const { POST } = await mockSessionRole("OWNER");
    const res = await POST();
    expect(res.status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("destroys the caller's own sessions and removes them", async () => {
    const { POST } = await mockSessionRole("MEMBER");
    deleteUser.mockResolvedValue({});
    const res = await POST();
    expect(res.status).toBe(200);
    expect(destroyAllSessions).toHaveBeenCalledWith(expect.anything(), "u2");
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "u2" } });
  });
});
```

- [ ] **Step 5: Run to confirm it fails, then write `src/app/api/team/leave/route.ts`**

```typescript
// src/app/api/team/leave/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { destroyAllSessions, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = withErrorHandling(async () => {
  const session = await requireSessionApi();

  if (session.user.role === "OWNER") {
    throw new HttpError(400, "The account owner cannot leave the team");
  }

  await destroyAllSessions(prisma, session.user.id);
  await prisma.user.delete({ where: { id: session.user.id } });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
```

Run: `npm test -- src/app/api/team/leave/route.test.ts` → expect PASS.

Note: the test file's `mockSessionRole` helper uses `vi.doMock` + `vi.resetModules()` + dynamic `import("./route")` specifically so each test can control the mocked role independently within one file — this differs from this codebase's usual static top-of-file `vi.mock`, and is only needed here because the two tests require genuinely different session fixtures. If a simpler pattern for per-test session mocking already exists elsewhere in this codebase (check before writing this file), prefer that instead.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/team/leave
git commit -m "feat: add POST /api/team/leave endpoint"
```

---

## Task 7: TeamCard UI on Settings

**Goal:** Let a merchant actually use all of the above — invite, view, remove, resend, revoke, and leave — from the Settings page.

**Files:**
- Create: `src/components/TeamCard.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] `/settings` shows a "Team" card alongside the existing cards
- [ ] Owner view: member table (email, role, joined date, "Remove" on non-Owner rows), pending invitations list (email, sent date, Resend/Revoke), an "Invite teammate" button + modal (email field only)
- [ ] Member (non-Owner) view: same member table read-only (no Remove buttons on others), a "Leave team" action on their own row, no Invite button
- [ ] All actions (invite, remove, resend, revoke, leave) refetch the list on success and show inline errors on failure

**Verify:** Manual check in the browser — invite a teammate, confirm it appears as pending, resend it, revoke it, then (as a second browser/incognito session accepting a fresh invite) confirm the new member appears and can leave.

**Steps:**

- [ ] **Step 1: Write the component**

```tsx
// src/components/TeamCard.tsx
"use client";

import { useEffect, useState } from "react";

interface Member {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
  expired: boolean;
}

export function TeamCard({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const isOwner = currentUserRole === "OWNER";

  const [members, setMembers] = useState<Member[] | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setPendingInvites(data.pendingInvites);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const email = inviteEmail.trim();
    if (email === "") {
      setError("Enter an email address.");
      return;
    }
    setBusyId("invite");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to send invite");
      }
      setInviteEmail("");
      setShowInviteForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId: string) {
    setError(null);
    setBusyId(userId);
    try {
      const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to remove member");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setBusyId(null);
    }
  }

  async function leaveTeam() {
    setError(null);
    setBusyId(currentUserId);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to leave team");
      }
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave team");
      setBusyId(null);
    }
  }

  async function resendInvite(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invitations/${id}/resend`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to resend invite");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend invite");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to revoke invite");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke invite");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Team</h2>
        {isOwner && (
          <button onClick={() => setShowInviteForm((v) => !v)} className="btn btn-ghost text-xs">
            {showInviteForm ? "Cancel" : "Invite teammate"}
          </button>
        )}
      </div>

      {isOwner && showInviteForm && (
        <form onSubmit={sendInvite} className="mt-3 flex items-end gap-2">
          <label className="flex-1 text-xs font-medium text-muted">
            Email
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="field mt-1 w-full"
              placeholder="teammate@example.com"
            />
          </label>
          <button type="submit" disabled={busyId === "invite"} className="btn btn-primary text-xs">
            {busyId === "invite" ? "Sending..." : "Send invite"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 divide-y divide-line">
        {(members ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="text-ink">{m.email}</span>
              <p className="text-xs text-faint">
                {m.role === "OWNER" ? "Owner" : "Member"} · joined {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </div>
            {isOwner && m.role !== "OWNER" && (
              <button
                onClick={() => removeMember(m.id)}
                disabled={busyId === m.id}
                aria-label={`Remove ${m.email}`}
                className="text-xs text-faint hover:text-danger"
              >
                {busyId === m.id ? "Removing..." : "Remove"}
              </button>
            )}
            {!isOwner && m.id === currentUserId && (
              <button
                onClick={leaveTeam}
                disabled={busyId === currentUserId}
                className="text-xs text-faint hover:text-danger"
              >
                {busyId === currentUserId ? "Leaving..." : "Leave team"}
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && pendingInvites.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Pending invites</h3>
          <div className="mt-2 divide-y divide-line">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-ink">{inv.email}</span>
                  <p className="text-xs text-faint">{inv.expired ? "Expired" : "Pending"}</p>
                </div>
                <button
                  onClick={() => resendInvite(inv.id)}
                  disabled={busyId === inv.id}
                  className="text-xs text-faint hover:text-ink"
                >
                  Resend
                </button>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  disabled={busyId === inv.id}
                  className="text-xs text-faint hover:text-danger"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire into the settings page**

`requireSessionPage()` returns `SessionInfo` (`{ user: SessionUser, merchantId }`), and `SessionUser` already carries `id` and `role` as of Task 2 — no new query needed. In `src/app/settings/page.tsx`, add the import:

```typescript
import { TeamCard } from "@/components/TeamCard";
```

Add `<TeamCard currentUserId={user.user.id} currentUserRole={user.user.role} />` right after `<ChangePasswordCard />` in the JSX, so the cards block reads:

```tsx
        <div className="space-y-6">
          <BillingCard
            planTier={merchant?.planTier ?? null}
            subscriptionStatus={merchant?.subscriptionStatus ?? null}
          />
          <ChangePasswordCard />
          <TeamCard currentUserId={user.user.id} currentUserRole={user.user.role} />
          <ShopifyConnectionCard />
          <WooCommerceConnectionCard />
        </div>
```

- [ ] **Step 3: Manually verify in the browser**

Log in as the Owner (demo account or a fresh signup), open `/settings`, confirm the Team card shows one member (yourself, Owner) and an "Invite teammate" button. Send an invite, confirm it appears under "Pending invites". Click Resend, confirm no error. Click Revoke, confirm it disappears. Send a fresh invite, open the link from Task 5 in an incognito window, accept it, then back in the Owner's browser refresh `/settings` and confirm the new Member appears with a "Remove" button. Log in as the new Member in incognito and confirm their `/settings` Team card shows no Invite button and has a "Leave team" action on their own row instead.

- [ ] **Step 4: Commit**

```bash
git add src/components/TeamCard.tsx src/app/settings/page.tsx
git commit -m "feat: add Team card to Settings"
```

---

## Task 8: Full-suite verification

**Goal:** Confirm the whole feature integrates cleanly with no regressions before merge.

**Files:** None (verification only)

**Acceptance Criteria:**
- [ ] Full test suite passes
- [ ] `npm run build` succeeds with no new route errors
- [ ] Manual regression spot-check: an existing single-user merchant (e.g. the demo account) still works exactly as before — login, dashboard, products, settings all unaffected
- [ ] Manual end-to-end walkthrough of the full invite → accept → remove/leave cycle (already exercised piecemeal in Tasks 5 and 7 — this step is the single unbroken run-through)

**Verify:** `npm test && npm run build` → both succeed

**Steps:**

- [ ] **Step 1: Run the full test suite**

```bash
cd /c/Users/pohde/projects/zorin
npm test
```

Expected: all suites pass, count higher than the pre-feature baseline (583 as of this plan's writing).

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: succeeds, `/settings`, `/invite/[token]`, and every new `/api/team*`/`/api/invite*` route listed in the route output, no new type errors.

- [ ] **Step 3: Regression spot-check on an existing single-user account**

Log in as the demo account (`demo@priceiq.example` / `demo1234`), confirm the dashboard, products, and existing settings cards (Billing, Change Password, Shopify/WooCommerce connections) all render and behave exactly as before — the Team card should show exactly one member (the demo user, Owner) with no pending invites.

- [ ] **Step 4: Full end-to-end walkthrough**

As the Owner: invite a teammate → confirm the email would be sent (check server logs if `RESEND_API_KEY` isn't configured locally — the send is a no-op but the invite record still exists) → grab the invite link directly from the database or a temporary log statement → open it in an incognito window → accept it, setting a password → confirm landing on `/dashboard` as the new Member → confirm the Member can see products/pricing/settings but their Team card has no Invite button and shows a "Leave team" action → back as the Owner, confirm the new Member appears in the Team card → remove them → confirm their session is dead (their incognito window's next request redirects to `/login`).

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final verification pass for multi-user teams"
```

(Skip this commit if Steps 1-4 required no code changes.)

---

## Post-implementation notes

- Schema change is not purely additive — dropping `@unique` on `User.merchantId` is a constraint *removal*, safe on both SQLite dev and production Postgres since it only relaxes a restriction and never conflicts with existing data. Still run the manual `prisma db push --schema=prisma/schema.production.prisma` confirmation pass against production after merge, per this project's standing pattern.
- Explicitly deferred (per the design doc): Admin role/granular permissions, seat-based billing or per-tier team-size limits, multi-merchant access for one login, audit log of who changed what, ownership transfer, self-serve account/data deletion.
- The dead/unused `src/lib/auth/requireSessionApi.ts` file (different signature from `src/lib/auth/requireSession.ts`'s `requireSessionApi`, confirmed unimported anywhere) was noticed during planning but is out of scope for this feature — worth a separate cleanup pass.
