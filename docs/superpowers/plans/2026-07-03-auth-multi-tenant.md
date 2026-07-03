# Auth + Multi-Tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single seeded merchant with email+password accounts, DB-backed sessions, and per-merchant data isolation across every route and page.

**Architecture:** New `src/lib/auth/` library (password hashing, session CRUD, session-reading helpers, ownership checks), three auth API routes, login/signup pages, then a scoping pass that threads the session `merchantId` through every data route. Enforcement lives inside route handlers via `requireSessionApi()` (throws `HttpError(401)`, converted by the existing `withErrorHandling` wrapper) — never edge middleware, because Prisma's Node APIs crash the edge runtime.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + better-sqlite3 adapter, `@node-rs/argon2` (new dep), Vitest 4 (node `unit` project), existing `HttpError`/`withErrorHandling`/`parseJsonBody` helpers.

**Spec:** `docs/superpowers/specs/2026-07-03-auth-multi-tenant-design.md`

**Environment notes (read first):**
- All Bash commands run from the user's home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Run scoped tests during tasks: `npx vitest run --project unit <path>`; full suite `npm test` (265 passing before this plan).
- `npm run build` currently fails on a **pre-existing** type error in `vitest.config.ts` (`passWithNoTests`); do not try to fix it, verify types with tests instead.
- Comments use `//` style, never docblocks. Money is integer cents. Path alias `@/` → `src/`.
- Stop the dev server before `npm run seed` (SQLite lock).
- This Next.js has breaking changes vs training data — check `node_modules/next/dist/docs/` before writing unfamiliar Next.js code. Async route `params` is a `Promise` and must be awaited; `cookies()` from `next/headers` is async.

---

### Task 1: password hashing (`@node-rs/argon2`)

**Files:**
- Create: `src/lib/auth/password.ts`
- Test: `src/lib/auth/password.test.ts`

- [ ] **Step 1: Install the dependency**

Run: `cd /c/Users/pohde/projects/priceiq && npm install @node-rs/argon2`
Expected: success; `package.json` gains the dep.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/auth/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("hunter22");
    expect(hash).not.toContain("hunter22");
    await expect(verifyPassword("hunter22", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("hunter22");
    await expect(verifyPassword("hunter23", hash)).resolves.toBe(false);
  });

  it("returns false (never throws) for a malformed hash", async () => {
    await expect(verifyPassword("hunter22", "not-a-hash")).resolves.toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/password.test.ts`
Expected: FAIL — cannot resolve `./password`

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/auth/password.ts`:

```ts
import { hash, verify } from "@node-rs/argon2";

// argon2id with library defaults — no tuning needed at this scale.
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

// Never throws: a malformed stored hash reads as "wrong password".
export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/password.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add package.json package-lock.json src/lib/auth/password.ts src/lib/auth/password.test.ts && git commit -m "feat: argon2id password hashing helpers"
```

---

### Task 2: schema (User + Session) and seed user

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add models to `prisma/schema.prisma`**

Append these models, and add `users User[]` to the existing `Merchant` model's fields:

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  merchantId   String    @unique
  merchant     Merchant  @relation(fields: [merchantId], references: [id])
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Push the schema**

Run: `cd /c/Users/pohde/projects/priceiq && npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema" (also regenerates the client).

- [ ] **Step 3: Update the seed**

In `prisma/seed.ts`:
1. Add import: `import { hashPassword } from "../src/lib/auth/password";`
2. In `main()`, extend the deleteMany block (order matters — children first):

```ts
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.competitorPrice.deleteMany();
  await prisma.competitorPriceObservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchant.deleteMany();
```

3. After the merchant is created, add:

```ts
  await prisma.user.create({
    data: {
      email: "demo@priceiq.example",
      passwordHash: await hashPassword("demo1234"),
      merchantId: merchant.id,
    },
  });
```

4. Update the final `console.log` to also mention the demo login:

```ts
  console.log(
    `Seeded merchant ${merchant.id} with ${PRODUCTS.length} products. Login: demo@priceiq.example / demo1234`,
  );
```

- [ ] **Step 4: Run the seed (STOP the dev server first if running)**

Run: `cd /c/Users/pohde/projects/priceiq && npm run seed`
Expected: seed completes and prints the demo login line.

- [ ] **Step 5: Run the full suite (regression check after client regen)**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: 268 passing (265 + 3 from Task 1)

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add prisma/schema.prisma prisma/seed.ts && git commit -m "feat: User + Session models; seed demo user"
```

---

### Task 3: session store

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/session.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createSession, destroySession, getSessionUser, SESSION_TTL_MS } from "./session";

const create = vi.fn();
const findUnique = vi.fn();
const del = vi.fn();
const deleteMany = vi.fn();
const prisma = {
  session: { create, findUnique, delete: del, deleteMany },
} as unknown as PrismaClient;

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
  del.mockReset();
  deleteMany.mockReset();
});

describe("createSession", () => {
  it("stores a 64-hex-char token with a ~30 day expiry and returns both", async () => {
    create.mockResolvedValue({});
    const before = Date.now();
    const { token, expiresAt } = await createSession(prisma, "u1");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_TTL_MS - 1000);
    expect(create).toHaveBeenCalledWith({
      data: { token, userId: "u1", expiresAt },
    });
  });

  it("generates a different token every call", async () => {
    create.mockResolvedValue({});
    const a = await createSession(prisma, "u1");
    const b = await createSession(prisma, "u1");
    expect(a.token).not.toBe(b.token);
  });
});

describe("getSessionUser", () => {
  const user = { id: "u1", email: "d@e.f", merchantId: "m1" };

  it("returns the user for a live session", async () => {
    findUnique.mockResolvedValue({
      token: "t",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    await expect(getSessionUser(prisma, "t")).resolves.toEqual(user);
  });

  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getSessionUser(prisma, "nope")).resolves.toBeNull();
  });

  it("returns null and deletes the row for an expired session", async () => {
    findUnique.mockResolvedValue({
      token: "t",
      expiresAt: new Date(Date.now() - 1000),
      user,
    });
    del.mockResolvedValue({});
    await expect(getSessionUser(prisma, "t")).resolves.toBeNull();
    expect(del).toHaveBeenCalledWith({ where: { token: "t" } });
  });

  it("returns null for an empty token without querying", async () => {
    await expect(getSessionUser(prisma, "")).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("destroySession", () => {
  it("deletes by token, tolerating already-gone rows", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await destroySession(prisma, "t");
    expect(deleteMany).toHaveBeenCalledWith({ where: { token: "t" } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/session.test.ts`
Expected: FAIL — cannot resolve `./session`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/auth/session.ts`:

```ts
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = "priceiq_session";

export interface SessionUser {
  id: string;
  email: string;
  merchantId: string;
}

export async function createSession(
  prisma: PrismaClient,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

// Null on missing or expired token; expired rows are deleted lazily here.
export async function getSessionUser(
  prisma: PrismaClient,
  token: string,
): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } });
    return null;
  }
  const { id, email, merchantId } = session.user;
  return { id, email, merchantId };
}

export async function destroySession(prisma: PrismaClient, token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}
```

Note: the "returns the user for a live session" test compares with `toEqual(user)` — the implementation returns a picked `{id, email, merchantId}` object, which matches because the mock user has exactly those fields.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/session.test.ts`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/auth/session.ts src/lib/auth/session.test.ts && git commit -m "feat: DB-backed session store (create/get/destroy, lazy expiry)"
```

---

### Task 4: requireSession helpers

**Files:**
- Create: `src/lib/auth/requireSession.ts`
- Test: `src/lib/auth/requireSession.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/requireSession.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    // Match next/navigation semantics: redirect throws.
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: getCookie }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("./session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./session")>()),
  getSessionUser,
}));

import { HttpError } from "@/lib/api/errors";
import { getSession, requireSessionApi, requireSessionPage } from "./requireSession";

const user = { id: "u1", email: "d@e.f", merchantId: "m1" };

beforeEach(() => {
  getCookie.mockReset();
  getSessionUser.mockReset();
  redirect.mockClear();
});

describe("getSession", () => {
  it("returns user + merchantId for a valid cookie", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    getSessionUser.mockResolvedValue(user);
    await expect(getSession()).resolves.toEqual({ user, merchantId: "m1" });
    expect(getSessionUser.mock.calls[0][1]).toBe("tok");
  });

  it("returns null when the cookie is absent", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(getSession()).resolves.toBeNull();
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("returns null when the token is invalid/expired", async () => {
    getCookie.mockReturnValue({ value: "bad" });
    getSessionUser.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("requireSessionApi", () => {
  it("returns the session when authenticated", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    getSessionUser.mockResolvedValue(user);
    await expect(requireSessionApi()).resolves.toEqual({ user, merchantId: "m1" });
  });

  it("throws HttpError 401 when unauthenticated", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(requireSessionApi()).rejects.toMatchObject(
      new HttpError(401, "unauthorized"),
    );
  });
});

describe("requireSessionPage", () => {
  it("redirects to /login when unauthenticated", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(requireSessionPage()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/requireSession.test.ts`
Expected: FAIL — cannot resolve `./requireSession`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/auth/requireSession.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/errors";
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

// For server components: unauthenticated visitors land on the login page.
export async function requireSessionPage(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/requireSession.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/auth/requireSession.ts src/lib/auth/requireSession.test.ts && git commit -m "feat: session-reading helpers for API routes and pages"
```

---

### Task 5: auth API routes (signup / login / logout)

**Files:**
- Create: `src/app/api/auth/signup/route.ts` + `route.test.ts`
- Create: `src/app/api/auth/login/route.ts` + `route.test.ts`
- Create: `src/app/api/auth/logout/route.ts` + `route.test.ts`

- [ ] **Step 1: Write the failing signup tests**

Create `src/app/api/auth/signup/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique, txMerchantCreate, txUserCreate, transaction } = vi.hoisted(() => {
  const txMerchantCreate = vi.fn();
  const txUserCreate = vi.fn();
  return {
    userFindUnique: vi.fn(),
    txMerchantCreate,
    txUserCreate,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ merchant: { create: txMerchantCreate }, user: { create: txUserCreate } }),
    ),
  };
});
const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: userFindUnique }, $transaction: transaction },
}));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
}));
vi.mock("@/lib/auth/password", () => ({ hashPassword }));

import { POST } from "./route";

const req = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request;

const valid = {
  email: "new@shop.example",
  password: "longenough",
  storeName: "New Shop",
  storeUrl: "https://new.example",
};

beforeEach(() => {
  userFindUnique.mockReset();
  txMerchantCreate.mockReset();
  txUserCreate.mockReset();
  transaction.mockClear();
  createSession.mockReset();
  hashPassword.mockReset();
});

describe("POST /api/auth/signup", () => {
  it("creates merchant + user, starts a session, sets the cookie, returns 201", async () => {
    userFindUnique.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed");
    txMerchantCreate.mockResolvedValue({ id: "m-new" });
    txUserCreate.mockResolvedValue({ id: "u-new" });
    createSession.mockResolvedValue({
      token: "tok123",
      expiresAt: new Date(Date.now() + 1000),
    });

    const res = await POST(req(valid));

    expect(res.status).toBe(201);
    expect(txMerchantCreate).toHaveBeenCalledWith({
      data: { name: "New Shop", storeUrl: "https://new.example" },
    });
    expect(txUserCreate).toHaveBeenCalledWith({
      data: { email: "new@shop.example", passwordHash: "hashed", merchantId: "m-new" },
    });
    expect(createSession.mock.calls[0][1]).toBe("u-new");
    expect(res.headers.get("set-cookie")).toContain("priceiq_session=tok123");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns 409 for a duplicate email", async () => {
    userFindUnique.mockResolvedValue({ id: "u-exists" });
    const res = await POST(req(valid));
    expect(res.status).toBe(409);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(req({ ...valid, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a password under 8 chars", async () => {
    const res = await POST(req({ ...valid, password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty store name", async () => {
    const res = await POST(req({ ...valid, storeName: "  " }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Write the failing login tests**

Create `src/app/api/auth/login/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));
const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
const { verifyPassword } = vi.hoisted(() => ({ verifyPassword: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: userFindUnique } } }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  createSession,
}));
vi.mock("@/lib/auth/password", () => ({ verifyPassword }));

import { POST } from "./route";

const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;

beforeEach(() => {
  userFindUnique.mockReset();
  createSession.mockReset();
  verifyPassword.mockReset();
});

describe("POST /api/auth/login", () => {
  it("sets the session cookie on valid credentials", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "h" });
    verifyPassword.mockResolvedValue(true);
    createSession.mockResolvedValue({
      token: "tok9",
      expiresAt: new Date(Date.now() + 1000),
    });

    const res = await POST(req({ email: "demo@priceiq.example", password: "demo1234" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("priceiq_session=tok9");
  });

  it("returns the same generic 401 for unknown email and wrong password", async () => {
    userFindUnique.mockResolvedValue(null);
    const unknownEmail = await POST(req({ email: "who@x.example", password: "whatever1" }));

    userFindUnique.mockResolvedValue({ id: "u1", passwordHash: "h" });
    verifyPassword.mockResolvedValue(false);
    const wrongPassword = await POST(req({ email: "demo@priceiq.example", password: "wrongpass" }));

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    await expect(unknownEmail.json()).resolves.toEqual(await wrongPassword.json());
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await POST(req({ email: "demo@priceiq.example" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Write the failing logout tests**

Create `src/app/api/auth/logout/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
const { destroySession } = vi.hoisted(() => ({ destroySession: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  destroySession,
}));

import { POST } from "./route";

beforeEach(() => {
  getCookie.mockReset();
  destroySession.mockReset();
});

describe("POST /api/auth/logout", () => {
  it("destroys the session and clears the cookie", async () => {
    getCookie.mockReturnValue({ value: "tok" });
    destroySession.mockResolvedValue(undefined);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(destroySession.mock.calls[0][1]).toBe("tok");
    expect(res.headers.get("set-cookie")).toContain("priceiq_session=;");
  });

  it("succeeds even with no cookie", async () => {
    getCookie.mockReturnValue(undefined);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(destroySession).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/app/api/auth`
Expected: FAIL — routes don't exist

- [ ] **Step 5: Implement the three routes**

Create `src/app/api/auth/signup/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
}

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const storeName = typeof body.storeName === "string" ? body.storeName.trim() : "";
  const storeUrl = typeof body.storeUrl === "string" ? body.storeUrl.trim() : "";

  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Invalid email address");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
  if (storeName === "") throw new HttpError(400, "Store name is required");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const merchant = await tx.merchant.create({ data: { name: storeName, storeUrl } });
    return tx.user.create({ data: { email, passwordHash, merchantId: merchant.id } });
  });

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
});
```

Create `src/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "../signup/route";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email === "" || password === "") throw new HttpError(400, "Email and password are required");

  // Same 401 body for unknown email and wrong password — no existence leak.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "invalid credentials");
  }

  const { token, expiresAt } = await createSession(prisma, user.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token, expiresAt);
  return res;
});
```

Create `src/app/api/auth/logout/route.ts`:

```ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = withErrorHandling(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(prisma, token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
```

Note: exporting `setSessionCookie` from a route file is allowed (only default-conflicting exports like `GET`/`POST` are constrained); if the Next build complains about the extra export, move `setSessionCookie` into `src/lib/auth/session.ts` instead and update both imports — but try the route-file export first since it keeps cookie policy next to its primary user.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/app/api/auth`
Expected: 10 tests PASS

- [ ] **Step 7: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/app/api/auth && git commit -m "feat: signup/login/logout API routes with session cookies"
```

---

### Task 6: login + signup pages, header logout

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/components/AuthForm.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/LogoutButton.tsx`

No unit tests for these (they are thin fetch-and-redirect forms; the route handlers they call are fully tested). Verify by build + manual smoke in Task 8.

- [ ] **Step 1: Create the shared form component**

Create `src/components/AuthForm.tsx`:

```tsx
"use client";
import { useState } from "react";

interface Field {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "url";
  placeholder?: string;
}

export function AuthForm({
  fields,
  submitLabel,
  endpoint,
}: {
  fields: Field[];
  submitLabel: string;
  endpoint: string;
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
      window.location.href = "/";
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
            required={f.name !== "storeUrl"}
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

- [ ] **Step 2: Create the pages**

Create `src/app/login/page.tsx`:

```tsx
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Log in to PriceIQ</h1>
      <AuthForm
        endpoint="/api/auth/login"
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Password", type: "password" },
        ]}
      />
      <p className="mt-4 text-sm text-muted">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </main>
  );
}
```

Create `src/app/signup/page.tsx`:

```tsx
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Create your PriceIQ account</h1>
      <AuthForm
        endpoint="/api/auth/signup"
        submitLabel="Sign up"
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Password (8+ characters)", type: "password" },
          { name: "storeName", label: "Store name", type: "text" },
          { name: "storeUrl", label: "Store URL (optional)", type: "url" },
        ]}
      />
      <p className="mt-4 text-sm text-muted">
        Have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Create the logout button and protect the dashboard**

Create `src/components/LogoutButton.tsx`:

```tsx
"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={logout} className="text-sm text-muted underline hover:text-ink">
      Log out
    </button>
  );
}
```

Replace `src/app/page.tsx` with:

```tsx
import { Dashboard } from "@/components/Dashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";

export default async function Home() {
  const { merchantId } = await requireSessionPage();
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">PriceIQ</h1>
          <p className="mt-1 text-sm text-muted">
            Competitor-aware pricing recommendations · {merchant?.name ?? "Your store"}
          </p>
        </div>
        <LogoutButton />
      </header>
      <Dashboard />
    </main>
  );
}
```

- [ ] **Step 4: Run existing UI tests (regression only)**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project ui`
Expected: all existing UI tests still pass (Dashboard is tested standalone; page.tsx isn't under test).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/app/login src/app/signup src/app/page.tsx src/components/AuthForm.tsx src/components/LogoutButton.tsx && git commit -m "feat: login/signup pages, dashboard protection + logout"
```

---

### Task 7: tenant scoping — ownership helper + wire every data route

**Files:**
- Create: `src/lib/auth/ownership.ts` + `ownership.test.ts`
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`
- Modify: `src/app/api/products/[id]/apply/route.ts`, `src/app/api/products/[id]/cogs/route.ts`, `src/app/api/products/[id]/recommendation/route.ts`, `src/app/api/products/[id]/refresh/route.ts`
- Modify: `src/app/api/apply/bulk/route.ts`, `src/app/api/refresh/route.ts`
- Modify: `src/app/api/products/catalog/route.ts`, `src/app/api/ingest/route.ts`
- Modify: `src/app/product/[id]/page.tsx` (redirect to /login on 401)
- Modify: existing route test files (add session mock)

- [ ] **Step 1: Write the failing ownership tests**

Create `src/lib/auth/ownership.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";
import { assertProductOwned, filterOwnedProductIds } from "./ownership";

const findUnique = vi.fn();
const findMany = vi.fn();
const prisma = { product: { findUnique, findMany } } as unknown as PrismaClient;

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
});

describe("assertProductOwned", () => {
  it("passes when the product belongs to the merchant", async () => {
    findUnique.mockResolvedValue({ merchantId: "m1" });
    await expect(assertProductOwned(prisma, "p1", "m1")).resolves.toBeUndefined();
  });

  it("throws 404 for a foreign product (no existence leak)", async () => {
    findUnique.mockResolvedValue({ merchantId: "m2" });
    await expect(assertProductOwned(prisma, "p1", "m1")).rejects.toMatchObject(
      new HttpError(404, "Not found"),
    );
  });

  it("throws 404 for a missing product", async () => {
    findUnique.mockResolvedValue(null);
    await expect(assertProductOwned(prisma, "gone", "m1")).rejects.toMatchObject(
      new HttpError(404, "Not found"),
    );
  });
});

describe("filterOwnedProductIds", () => {
  it("keeps only ids owned by the merchant", async () => {
    findMany.mockResolvedValue([{ id: "p1" }, { id: "p3" }]);
    await expect(
      filterOwnedProductIds(prisma, ["p1", "p2", "p3"], "m1"),
    ).resolves.toEqual(["p1", "p3"]);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1", "p2", "p3"] }, merchantId: "m1" },
      select: { id: true },
    });
  });

  it("returns empty for an empty input without querying", async () => {
    await expect(filterOwnedProductIds(prisma, [], "m1")).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/auth/ownership.test.ts` — expect FAIL.

Create `src/lib/auth/ownership.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";

// 404 (never 403) on foreign or missing products — no existence leak.
export async function assertProductOwned(
  prisma: PrismaClient,
  productId: string,
  merchantId: string,
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { merchantId: true },
  });
  if (!product || product.merchantId !== merchantId) {
    throw new HttpError(404, "Not found");
  }
}

export async function filterOwnedProductIds(
  prisma: PrismaClient,
  productIds: string[],
  merchantId: string,
): Promise<string[]> {
  if (productIds.length === 0) return [];
  const owned = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId },
    select: { id: true },
  });
  return owned.map((p) => p.id);
}
```

Re-run — expect 5 tests PASS. Commit:

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/auth/ownership.ts src/lib/auth/ownership.test.ts && git commit -m "feat: product ownership checks (404 on foreign, id filtering)"
```

- [ ] **Step 3: Wire the session into every data route**

Apply this pattern to each route (read each file first; keep all existing logic):

1. Add import: `import { requireSessionApi } from "@/lib/auth/requireSession";` (plus `assertProductOwned` / `filterOwnedProductIds` from `@/lib/auth/ownership` where noted).
2. First line inside each handler: `const { merchantId } = await requireSessionApi();`

Per-route specifics:

- **`src/app/api/products/route.ts` (GET):** add `where: { merchantId }` to the `findMany`.
- **`src/app/api/products/[id]/route.ts` (GET):** change `findUnique({ where: { id }, ... })` to `findFirst({ where: { id, merchantId }, include: { competitors: true } })` — the existing `if (!p) throw new HttpError(404, ...)` then covers both missing and foreign.
- **`src/app/api/products/[id]/apply/route.ts`, `.../cogs/route.ts`, `.../recommendation/route.ts`, `.../refresh/route.ts`:** after resolving `const { id } = await params;`, call `await assertProductOwned(prisma, id, merchantId);` before the existing logic. If a file doesn't already import `prisma`, add `import { prisma } from "@/lib/db";`.
- **`src/app/api/apply/bulk/route.ts` and `src/app/api/refresh/route.ts`:** after validating `ids`, replace the loop source with `const ownedIds = await filterOwnedProductIds(prisma, ids as string[], merchantId);` and iterate `ownedIds` (foreign ids are silently ignored per spec).
- **`src/app/api/products/catalog/route.ts`:** delete the `resolveMerchantId()` helper entirely; use the session's `merchantId` for `importProducts`.
- **`src/app/api/ingest/route.ts`:** read the file first; replace its merchant resolution (same `findFirst` pattern) with the session `merchantId`.

- [ ] **Step 4: Redirect the product page to /login on 401**

In `src/app/product/[id]/page.tsx`, the fetch currently does `if (!r.ok) throw new Error("not found")`. Change that block to:

```ts
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => data && active && setD(data))
```

Apply the same 401 check to the recommendation fetch in the same file if it has separate error handling (read the file first).

- [ ] **Step 5: Fix the existing route tests**

Every modified route's test file now needs the session mocked. Add this `vi.mock` (with the other mocks, before route import) to **each** existing test file of the routes touched in Step 3 (find them with `ls src/app/api/**/route.test.ts`):

```ts
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
  })),
}));
```

Then adjust per file:
- Tests whose prisma mocks stub `product.findUnique` for the by-id GET must switch to `findFirst` (same return values) to match the route change.
- Tests for by-id sub-routes (apply/cogs/recommendation/refresh) need their prisma mock to also stub `product.findUnique` returning `{ merchantId: "m1" }` for the `assertProductOwned` call — or mock `@/lib/auth/ownership` with `vi.mock("@/lib/auth/ownership", () => ({ assertProductOwned: vi.fn(async () => undefined), filterOwnedProductIds: vi.fn(async (_p: unknown, ids: string[]) => ids) }))`. Prefer mocking the ownership module — it keeps existing prisma mocks untouched.
- `catalog/route.test.ts`: the "creates a default merchant when none exists" test is now obsolete — delete it; the happy-path test asserts `importProducts.mock.calls[0][1]` is `"m1"` (from the session) and the `merchant.findFirst`/`create` mocks can be removed.

- [ ] **Step 6: Add one new scoping test per bulk route**

In `src/app/api/refresh/route.test.ts` (create it if it doesn't exist; check first) add — with the session mock above, and mocking `@/lib/auth/ownership` so `filterOwnedProductIds` returns only `["p1"]`:

```ts
  it("refreshes only owned ids, silently dropping foreign ones", async () => {
    // filterOwnedProductIds mocked to return ["p1"] for input ["p1", "foreign"]
    refreshProduct.mockResolvedValue({ refreshed: 1, failed: 0, results: [] });
    const res = await POST(req({ productIds: ["p1", "foreign"] }));
    expect(res.status).toBe(200);
    expect(refreshProduct).toHaveBeenCalledTimes(1);
    expect(refreshProduct.mock.calls[0][1]).toBe("p1");
  });
```

Mirror the same shape in the apply/bulk test file (`applyDecision` called once with `"p1"`). Match each file's existing mock setup — read them first.

- [ ] **Step 7: Run the full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: all tests pass (count will be ~285: 265 + 3 password + 7 session + 6 requireSession + 10 auth routes + 5 ownership + 2 bulk-scoping, minus 1 deleted catalog test — report the exact number).

- [ ] **Step 8: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add -A src && git commit -m "feat: per-merchant scoping across all data routes and pages"
```

---

### Task 8: live smoke test + docs

**Files:**
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Reseed and boot**

```bash
cd /c/Users/pohde/projects/priceiq && npm run seed
```
(Then start the dev server in the background: `npm run dev` with `run_in_background`.)

- [ ] **Step 2: Smoke-test the auth flow with curl**

```bash
# Unauthenticated API → 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/products
# → 401

# Login → cookie
curl -s -c /tmp/priceiq-cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"demo@priceiq.example","password":"demo1234"}' \
  http://localhost:3000/api/auth/login
# → {"ok":true}

# Authenticated products list → 200 with rows
curl -s -b /tmp/priceiq-cookies.txt http://localhost:3000/api/products | head -c 200
# → JSON array of products

# Signup a second merchant, confirm isolation
curl -s -c /tmp/priceiq-cookies2.txt -H "Content-Type: application/json" \
  -d '{"email":"second@shop.example","password":"password2","storeName":"Second Shop","storeUrl":""}' \
  http://localhost:3000/api/auth/signup
# → {"ok":true}
curl -s -b /tmp/priceiq-cookies2.txt http://localhost:3000/api/products
# → [] (empty — no products for the new merchant)

# Cross-tenant by-id access → 404 (grab a product id from the first list)
curl -s -o /dev/null -w "%{http_code}" -b /tmp/priceiq-cookies2.txt \
  http://localhost:3000/api/products/<id-from-first-merchant>
# → 404

# Logout → subsequent call 401
curl -s -b /tmp/priceiq-cookies.txt -X POST http://localhost:3000/api/auth/logout
curl -s -o /dev/null -w "%{http_code}" -b /tmp/priceiq-cookies.txt http://localhost:3000/api/products
# → 401 (cookie cleared server-side; the session row is gone even if the file still has the token)
```

All six checks must produce the expected results. If the dev server 404s nested routes, kill node, `rm -rf .next`, restart (known Turbopack issue — see HANDOVER §5).

- [ ] **Step 3: Update `docs/HANDOVER.md`**

- Status line: mention auth + multi-tenant implemented, update test count to the Task 7 final number.
- Section 1: change "Single seeded merchant, no auth" to describe email+password auth, 1 user = 1 merchant, demo login `demo@priceiq.example` / `demo1234`.
- Add a short section describing `src/lib/auth/` (password/session/requireSession/ownership), the three auth routes, and the scoping rules (404 on foreign by-id, filtered bulk ops, session-scoped lists).
- Section 6 (Next steps): remaining deferred items are now real competitor discovery, price-change alerts, Shopify OAuth; note deferred auth hardening (rate limiting, password reset, CSRF beyond sameSite).
- Section 7 (How to resume): update expected test count; add the demo login and note that hitting the app now starts at `/login`.

- [ ] **Step 4: Final full suite + commit**

```bash
cd /c/Users/pohde/projects/priceiq && npm test
cd /c/Users/pohde/projects/priceiq && git add docs/HANDOVER.md && git commit -m "docs: auth + multi-tenant complete; smoke-tested cross-tenant isolation"
```
