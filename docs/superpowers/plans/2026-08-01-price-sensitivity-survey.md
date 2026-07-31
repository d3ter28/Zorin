# Price Sensitivity (Van Westendorp) Survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant generate a shareable, no-login Van Westendorp price-sensitivity survey link per product, collect customer responses, and see the results as a separate advisory panel on the product detail page.

**Architecture:** A public token-based survey page (`/survey/[token]`, no app chrome) posts to a public API route that validates and stores responses (rate-limited + cookie-guarded against casual resubmission). A pure calculation module computes the Van Westendorp price-sensitivity curves and their intersections. Results render as a new card on the authenticated product detail page, alongside — not blended into — the existing elasticity-based recommendation.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, Vitest 4, existing `checkWebhookRateLimit` (burst-tolerant limiter built for the webhook feature), plain SVG charting matching `DemandCurve.tsx`'s style.

**User decisions (already made):**
- Distribution is entirely the merchant's own responsibility via a copyable link — Zorin never sends survey emails or stores a customer email list.
- Low-response results are shown immediately with a visible low-confidence label, not hidden behind a hard minimum (mirrors the existing `ModelHealthBadge` pattern). Confidence tiers: none <5 responses, low 5–19, good 20+.
- Results are a separate advisory panel, never blended into the `RAISE`/`LOWER`/`HOLD` recommendation engine.
- Anti-spam: a browser cookie blocks immediate resubmission from the same device, plus the existing IP-based rate limiter (reused from the webhook feature) caps submissions per IP.

---

## Task 1: Schema — PriceSurvey + PriceSurveyResponse models

**Goal:** Add the data model this feature depends on.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.production.prisma`

**Acceptance Criteria:**
- [ ] `PriceSurvey` model exists with a unique `token`, relation to `Product` (`onDelete: Cascade`), and `merchantId`
- [ ] `PriceSurveyResponse` model exists with the four price fields and a relation to `PriceSurvey` (`onDelete: Cascade`)
- [ ] `Product` gains a `priceSurveys PriceSurvey[]` relation
- [ ] Both schema files stay in sync (only datasource differs)

**Verify:** `npx prisma db push && npx prisma generate` → no errors

**Steps:**

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add to the `Product` model's relations block (alongside `recommendation`, `salesRecords`, etc.):

```prisma
  priceSurveys         PriceSurvey[]
```

Add two new models anywhere in the file (e.g. after `PriceChange`):

```prisma
model PriceSurvey {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  merchantId String
  token      String   @unique
  createdAt  DateTime @default(now())
  responses  PriceSurveyResponse[]
}

model PriceSurveyResponse {
  id                    String      @id @default(cuid())
  surveyId              String
  survey                PriceSurvey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  tooCheapCents         Int
  goodValueCents        Int
  gettingExpensiveCents Int
  tooExpensiveCents     Int
  submittedAt           DateTime    @default(now())
}
```

- [ ] **Step 2: Apply the identical model additions to `prisma/schema.production.prisma`** (same `Product.priceSurveys` line, same two new models — only the top-level `datasource` block differs between the two files).

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
git commit -m "feat: add PriceSurvey/PriceSurveyResponse models for the price-sensitivity survey feature"
```

---

## Task 2: Van Westendorp calculation module

**Goal:** A pure, testable function that computes the four Van Westendorp intersections and a confidence tier from a set of survey responses.

**Files:**
- Create: `src/lib/priceSurvey/vanWestendorp.ts`
- Test: `src/lib/priceSurvey/vanWestendorp.test.ts`

**Acceptance Criteria:**
- [ ] `calculateVanWestendorp(responses)` returns PMC, PME, OPP, IPP, acceptable range, response count, and confidence tier
- [ ] Confidence tiering: `none` for <5 responses, `low` for 5–19, `good` for 20+
- [ ] Empty input returns all-zero result with `confidence: "none"`, without throwing
- [ ] A single response produces a deterministic, hand-verifiable result

**Verify:** `npm test -- src/lib/priceSurvey/vanWestendorp.test.ts` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/priceSurvey/vanWestendorp.test.ts
import { describe, it, expect } from "vitest";
import { calculateVanWestendorp } from "./vanWestendorp";

describe("calculateVanWestendorp", () => {
  it("returns an all-zero, no-confidence result for an empty response set", () => {
    const result = calculateVanWestendorp([]);
    expect(result).toEqual({
      pointOfMarginalCheapness: 0,
      pointOfMarginalExpensiveness: 0,
      optimalPricePoint: 0,
      indifferencePricePoint: 0,
      acceptableRange: { min: 0, max: 0 },
      responseCount: 0,
      confidence: "none",
    });
  });

  it("computes hand-verified intersections for a single response", () => {
    // One respondent: too cheap $5, good value $10, getting expensive $15, too expensive $20.
    // Hand-derived (see design doc / plan comments for the derivation):
    //   PMC = 1000, PME = 1500, OPP = 1000, IPP = 1250
    const result = calculateVanWestendorp([
      { tooCheapCents: 500, goodValueCents: 1000, gettingExpensiveCents: 1500, tooExpensiveCents: 2000 },
    ]);
    expect(result.pointOfMarginalCheapness).toBe(1000);
    expect(result.pointOfMarginalExpensiveness).toBe(1500);
    expect(result.optimalPricePoint).toBe(1000);
    expect(result.indifferencePricePoint).toBe(1250);
    expect(result.acceptableRange).toEqual({ min: 1000, max: 1500 });
    expect(result.responseCount).toBe(1);
    expect(result.confidence).toBe("none");
  });

  it("tiers confidence at the 5 and 20 response boundaries", () => {
    const make = (n: number) =>
      Array.from({ length: n }, () => ({
        tooCheapCents: 500,
        goodValueCents: 1000,
        gettingExpensiveCents: 1500,
        tooExpensiveCents: 2000,
      }));

    expect(calculateVanWestendorp(make(4)).confidence).toBe("none");
    expect(calculateVanWestendorp(make(5)).confidence).toBe("low");
    expect(calculateVanWestendorp(make(19)).confidence).toBe("low");
    expect(calculateVanWestendorp(make(20)).confidence).toBe("good");
  });

  it("handles multiple distinct responses without throwing and keeps acceptableRange.min <= max", () => {
    const result = calculateVanWestendorp([
      { tooCheapCents: 400, goodValueCents: 900, gettingExpensiveCents: 1400, tooExpensiveCents: 1900 },
      { tooCheapCents: 600, goodValueCents: 1100, gettingExpensiveCents: 1600, tooExpensiveCents: 2100 },
      { tooCheapCents: 500, goodValueCents: 1000, gettingExpensiveCents: 1500, tooExpensiveCents: 2000 },
    ]);
    expect(result.responseCount).toBe(3);
    expect(result.acceptableRange.min).toBeLessThanOrEqual(result.acceptableRange.max);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/priceSurvey/vanWestendorp.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/priceSurvey/vanWestendorp.ts

export interface VanWestendorpInput {
  tooCheapCents: number;
  goodValueCents: number;
  gettingExpensiveCents: number;
  tooExpensiveCents: number;
}

export interface VanWestendorpResult {
  pointOfMarginalCheapness: number;
  pointOfMarginalExpensiveness: number;
  optimalPricePoint: number;
  indifferencePricePoint: number;
  acceptableRange: { min: number; max: number };
  responseCount: number;
  confidence: "none" | "low" | "good";
}

function confidenceTier(n: number): "none" | "low" | "good" {
  if (n < 5) return "none";
  if (n < 20) return "low";
  return "good";
}

/** Fraction of responses whose value is >= p — used for the "too cheap" and "good value" curves, which decrease as price rises. */
function cumulativeAtLeast(
  responses: VanWestendorpInput[],
  p: number,
  getValue: (r: VanWestendorpInput) => number,
): number {
  const count = responses.filter((r) => getValue(r) >= p).length;
  return count / responses.length;
}

/** Fraction of responses whose value is <= p — used for the "getting expensive" and "too expensive" curves, which increase as price rises. */
function cumulativeAtMost(
  responses: VanWestendorpInput[],
  p: number,
  getValue: (r: VanWestendorpInput) => number,
): number {
  const count = responses.filter((r) => getValue(r) <= p).length;
  return count / responses.length;
}

/**
 * Finds the price at which a decreasing curve and an increasing curve cross,
 * via linear interpolation between the two adjacent grid points that bracket
 * the sign change of (increasing - decreasing). Falls back to the grid's
 * midpoint if no crossing is found (e.g. a single response, or curves that
 * never cross within the observed price range).
 */
function findIntersection(
  grid: number[],
  decreasing: (p: number) => number,
  increasing: (p: number) => number,
): number {
  if (grid.length === 0) return 0;
  if (grid.length === 1) return grid[0];

  for (let i = 0; i < grid.length - 1; i++) {
    const p1 = grid[i];
    const p2 = grid[i + 1];
    const diff1 = increasing(p1) - decreasing(p1);
    const diff2 = increasing(p2) - decreasing(p2);

    if (diff1 === 0) return p1;
    if ((diff1 < 0 && diff2 >= 0) || (diff1 > 0 && diff2 <= 0)) {
      const t = diff1 / (diff1 - diff2);
      return Math.round(p1 + t * (p2 - p1));
    }
  }

  return Math.round((grid[0] + grid[grid.length - 1]) / 2);
}

export function calculateVanWestendorp(responses: VanWestendorpInput[]): VanWestendorpResult {
  const responseCount = responses.length;

  if (responseCount === 0) {
    return {
      pointOfMarginalCheapness: 0,
      pointOfMarginalExpensiveness: 0,
      optimalPricePoint: 0,
      indifferencePricePoint: 0,
      acceptableRange: { min: 0, max: 0 },
      responseCount: 0,
      confidence: "none",
    };
  }

  const grid = Array.from(
    new Set(
      responses.flatMap((r) => [
        r.tooCheapCents,
        r.goodValueCents,
        r.gettingExpensiveCents,
        r.tooExpensiveCents,
      ]),
    ),
  ).sort((a, b) => a - b);

  const tooCheap = (p: number) => cumulativeAtLeast(responses, p, (r) => r.tooCheapCents);
  const goodValue = (p: number) => cumulativeAtLeast(responses, p, (r) => r.goodValueCents);
  const gettingExpensive = (p: number) => cumulativeAtMost(responses, p, (r) => r.gettingExpensiveCents);
  const tooExpensive = (p: number) => cumulativeAtMost(responses, p, (r) => r.tooExpensiveCents);

  const pointOfMarginalCheapness = findIntersection(grid, tooCheap, gettingExpensive);
  const pointOfMarginalExpensiveness = findIntersection(grid, goodValue, tooExpensive);
  const optimalPricePoint = findIntersection(grid, tooCheap, tooExpensive);
  const indifferencePricePoint = findIntersection(grid, goodValue, gettingExpensive);

  return {
    pointOfMarginalCheapness,
    pointOfMarginalExpensiveness,
    optimalPricePoint,
    indifferencePricePoint,
    acceptableRange: {
      min: Math.min(pointOfMarginalCheapness, pointOfMarginalExpensiveness),
      max: Math.max(pointOfMarginalCheapness, pointOfMarginalExpensiveness),
    },
    responseCount,
    confidence: confidenceTier(responseCount),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/priceSurvey/vanWestendorp.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/priceSurvey/vanWestendorp.ts src/lib/priceSurvey/vanWestendorp.test.ts
git commit -m "feat: add Van Westendorp price-sensitivity calculation module"
```

---

## Task 3: Survey creation + listing API (authenticated)

**Goal:** Let a merchant create a survey for a product they own and list its surveys.

**Files:**
- Create: `src/lib/priceSurvey/token.ts`
- Test: `src/lib/priceSurvey/token.test.ts`
- Create: `src/app/api/products/[id]/surveys/route.ts`
- Test: `src/app/api/products/[id]/surveys/route.test.ts`

**Acceptance Criteria:**
- [ ] `generateSurveyToken()` returns a 64-char hex string
- [ ] `POST /api/products/[id]/surveys` creates a `PriceSurvey` for a product the caller owns, returns `{ id, token, shareUrl }`
- [ ] `POST` on a product owned by another merchant (or a nonexistent product) returns 404
- [ ] `GET /api/products/[id]/surveys` lists the caller's surveys for that product, each with a `responseCount`, most recent first

**Verify:** `npm test -- src/lib/priceSurvey/token.test.ts "src/app/api/products/[id]/surveys/route.test.ts"` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test for the token generator**

```typescript
// src/lib/priceSurvey/token.test.ts
import { describe, it, expect } from "vitest";
import { generateSurveyToken } from "./token";

describe("generateSurveyToken", () => {
  it("returns a 64-character hex string", () => {
    expect(generateSurveyToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different value on each call", () => {
    expect(generateSurveyToken()).not.toBe(generateSurveyToken());
  });
});
```

- [ ] **Step 2: Run, confirm it fails, then implement**

```typescript
// src/lib/priceSurvey/token.ts
import { randomBytes } from "node:crypto";

/** Generates an unguessable token for a survey's public URL — not a sequential id, so a stranger can't enumerate a merchant's other surveys. */
export function generateSurveyToken(): string {
  return randomBytes(32).toString("hex");
}
```

Run: `npm test -- src/lib/priceSurvey/token.test.ts` → PASS (2 tests)

- [ ] **Step 3: Write the failing route test**

```typescript
// src/app/api/products/[id]/surveys/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateSurveyToken } = vi.hoisted(() => ({
  generateSurveyToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique: vi.fn() },
    priceSurvey: { create: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/priceSurvey/token", () => ({ generateSurveyToken }));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));
vi.mock("@/lib/appConfig", () => ({ getAppUrl: () => "https://tryzorin.com" }));

import { POST, GET } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  generateSurveyToken.mockReturnValue("a".repeat(64));
});

describe("POST /api/products/[id]/surveys", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(req(), ctx("p1"));
    expect(res.status).toBe(404);
    expect(prisma.priceSurvey.create).not.toHaveBeenCalled();
  });

  it("creates a survey and returns its shareable URL", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ merchantId: "m1" });
    (prisma.priceSurvey.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      token: "a".repeat(64),
    });

    const res = await POST(req(), ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "s1",
      token: "a".repeat(64),
      shareUrl: `https://tryzorin.com/survey/${"a".repeat(64)}`,
    });
    expect(prisma.priceSurvey.create).toHaveBeenCalledWith({
      data: { productId: "p1", merchantId: "m1", token: "a".repeat(64) },
    });
  });
});

describe("GET /api/products/[id]/surveys", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req(), ctx("p1"));
    expect(res.status).toBe(404);
  });

  it("lists surveys with a response count, most recent first", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ merchantId: "m1" });
    (prisma.priceSurvey.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s2", token: "b".repeat(64), createdAt: new Date("2026-08-01"), _count: { responses: 3 } },
      { id: "s1", token: "a".repeat(64), createdAt: new Date("2026-07-01"), _count: { responses: 12 } },
    ]);

    const res = await GET(req(), ctx("p1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "s2", shareUrl: `https://tryzorin.com/survey/${"b".repeat(64)}`, createdAt: "2026-08-01T00:00:00.000Z", responseCount: 3 },
      { id: "s1", shareUrl: `https://tryzorin.com/survey/${"a".repeat(64)}`, createdAt: "2026-07-01T00:00:00.000Z", responseCount: 12 },
    ]);
    expect(prisma.priceSurvey.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- "src/app/api/products/[id]/surveys/route.test.ts"`
Expected: FAIL — route module doesn't exist

- [ ] **Step 5: Write the route**

```typescript
// src/app/api/products/[id]/surveys/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { generateSurveyToken } from "@/lib/priceSurvey/token";
import { getAppUrl } from "@/lib/appConfig";

function shareUrlFor(token: string): string {
  return `${getAppUrl()}/survey/${token}`;
}

async function assertProductOwnedInline(productId: string, merchantId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { merchantId: true },
  });
  if (!product || product.merchantId !== merchantId) {
    throw new HttpError(404, "Not found");
  }
}

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwnedInline(productId, merchantId);

    const token = generateSurveyToken();
    const survey = await prisma.priceSurvey.create({
      data: { productId, merchantId, token },
    });

    return NextResponse.json({
      id: survey.id,
      token: survey.token,
      shareUrl: shareUrlFor(survey.token),
    });
  },
);

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId } = await params;
    await assertProductOwnedInline(productId, merchantId);

    const surveys = await prisma.priceSurvey.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });

    return NextResponse.json(
      surveys.map((s) => ({
        id: s.id,
        shareUrl: shareUrlFor(s.token),
        createdAt: s.createdAt.toISOString(),
        responseCount: s._count.responses,
      })),
    );
  },
);
```

Note: this uses a local `assertProductOwnedInline` rather than the shared `src/lib/auth/ownership.ts`'s `assertProductOwned` because that helper takes a `PrismaClient` parameter for testability in other routes — here the route already imports the module-level `prisma` singleton directly (matching this route's own test's mocking style, which mocks `@/lib/db` wholesale rather than passing a client argument). If you find `assertProductOwned` fits more cleanly once you're looking at the real file, prefer reusing it instead of duplicating the check — just confirm its test-mocking shape matches what this task's test expects.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- "src/app/api/products/[id]/surveys/route.test.ts"`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add src/lib/priceSurvey/token.ts src/lib/priceSurvey/token.test.ts "src/app/api/products/[id]/surveys/route.ts" "src/app/api/products/[id]/surveys/route.test.ts"
git commit -m "feat: add survey creation/listing API for merchants"
```

---

## Task 4: Public survey lookup + respond API

**Goal:** The public-facing endpoints a customer's browser actually calls — no login, rate-limited, cookie-guarded against casual resubmission.

**Files:**
- Create: `src/app/api/survey/[token]/route.ts`
- Test: `src/app/api/survey/[token]/route.test.ts`
- Create: `src/app/api/survey/[token]/respond/route.ts`
- Test: `src/app/api/survey/[token]/respond/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET /api/survey/[token]` returns the product title/image for a valid token, 404 for an unknown one
- [ ] `POST /api/survey/[token]/respond` rejects non-positive or out-of-order prices (too-cheap > too-expensive) with 400
- [ ] A second submission from the same browser (same anti-resubmit cookie) is rejected with 409, without creating a second `PriceSurveyResponse`
- [ ] Rate limiting via `checkWebhookRateLimit`, keyed by requester IP, returns 429 when exceeded
- [ ] A successful submission creates the `PriceSurveyResponse` and sets the anti-resubmit cookie

**Verify:** `npm test -- "src/app/api/survey/[token]"` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test for the lookup route**

```typescript
// src/app/api/survey/[token]/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    priceSurvey: { findUnique: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/survey/[token]", () => {
  it("returns 404 for an unknown token", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req(), ctx("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns the product title/image for a valid token", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      product: { title: "Widget", imageUrl: "https://cdn.example.com/w.jpg" },
    });
    const res = await GET(req(), ctx("good-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ productTitle: "Widget", productImageUrl: "https://cdn.example.com/w.jpg" });
    expect(prisma.priceSurvey.findUnique).toHaveBeenCalledWith({
      where: { token: "good-token" },
      select: { id: true, product: { select: { title: true, imageUrl: true } } },
    });
  });
});
```

- [ ] **Step 2: Run to confirm it fails, then write the lookup route**

```typescript
// src/app/api/survey/[token]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;

    const survey = await prisma.priceSurvey.findUnique({
      where: { token },
      select: { id: true, product: { select: { title: true, imageUrl: true } } },
    });
    if (!survey) throw new HttpError(404, "Survey not found");

    return NextResponse.json({
      productTitle: survey.product.title,
      productImageUrl: survey.product.imageUrl,
    });
  },
);
```

Run: `npm test -- "src/app/api/survey/[token]/route.test.ts"` → PASS (2 tests)

- [ ] **Step 3: Commit the lookup route**

```bash
git add "src/app/api/survey/[token]/route.ts" "src/app/api/survey/[token]/route.test.ts"
git commit -m "feat: add public survey lookup route"
```

- [ ] **Step 4: Write the failing test for the respond route**

```typescript
// src/app/api/survey/[token]/respond/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkWebhookRateLimit } = vi.hoisted(() => ({
  checkWebhookRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    priceSurvey: { findUnique: vi.fn() },
    priceSurveyResponse: { create: vi.fn() },
  },
}));
vi.mock("@/lib/auth/rateLimit", () => ({ checkWebhookRateLimit }));

import { POST } from "./route";
import { prisma } from "@/lib/db";

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return {
    json: async () => body,
    headers: { get: (key: string) => headers[key] ?? null },
  } as unknown as Request;
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_BODY = {
  tooCheapCents: 500,
  goodValueCents: 1000,
  gettingExpensiveCents: 1500,
  tooExpensiveCents: 2000,
};

beforeEach(() => {
  vi.clearAllMocks();
  checkWebhookRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s1" });
  (prisma.priceSurveyResponse.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "r1" });
});

describe("POST /api/survey/[token]/respond", () => {
  it("returns 404 for an unknown token", async () => {
    (prisma.priceSurvey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(req(VALID_BODY), ctx("bad-token"));
    expect(res.status).toBe(404);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    checkWebhookRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(req(VALID_BODY, { "x-forwarded-for": "1.2.3.4" }), ctx("good-token"));
    expect(res.status).toBe(429);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive price", async () => {
    const res = await POST(req({ ...VALID_BODY, tooCheapCents: 0 }), ctx("good-token"));
    expect(res.status).toBe(400);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 400 when tooCheap exceeds tooExpensive", async () => {
    const res = await POST(
      req({ ...VALID_BODY, tooCheapCents: 3000, tooExpensiveCents: 2000 }),
      ctx("good-token"),
    );
    expect(res.status).toBe(400);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the anti-resubmit cookie for this survey is already present", async () => {
    const res = await POST(
      req(VALID_BODY, { cookie: "zorin_survey_resp_s1=1" }),
      ctx("good-token"),
    );
    expect(res.status).toBe(409);
    expect(prisma.priceSurveyResponse.create).not.toHaveBeenCalled();
  });

  it("creates the response and sets the anti-resubmit cookie on success", async () => {
    const res = await POST(req(VALID_BODY), ctx("good-token"));
    expect(res.status).toBe(200);
    expect(prisma.priceSurveyResponse.create).toHaveBeenCalledWith({
      data: {
        surveyId: "s1",
        tooCheapCents: 500,
        goodValueCents: 1000,
        gettingExpensiveCents: 1500,
        tooExpensiveCents: 2000,
      },
    });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("zorin_survey_resp_s1=1");
  });
});
```

- [ ] **Step 5: Run to confirm it fails, then write the respond route**

```typescript
// src/app/api/survey/[token]/respond/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { checkWebhookRateLimit } from "@/lib/auth/rateLimit";

function cookieName(surveyId: string): string {
  return `zorin_survey_resp_${surveyId}`;
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const { allowed } = await checkWebhookRateLimit(ip);
    if (!allowed) throw new HttpError(429, "Too many submissions — try again shortly");

    const { token } = await params;
    const survey = await prisma.priceSurvey.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!survey) throw new HttpError(404, "Survey not found");

    if (getCookie(req, cookieName(survey.id)) !== null) {
      throw new HttpError(409, "You've already responded to this survey");
    }

    const body = await req.json() as {
      tooCheapCents?: unknown;
      goodValueCents?: unknown;
      gettingExpensiveCents?: unknown;
      tooExpensiveCents?: unknown;
    };

    const { tooCheapCents, goodValueCents, gettingExpensiveCents, tooExpensiveCents } = body;
    if (
      !isPositiveInt(tooCheapCents) ||
      !isPositiveInt(goodValueCents) ||
      !isPositiveInt(gettingExpensiveCents) ||
      !isPositiveInt(tooExpensiveCents)
    ) {
      throw new HttpError(400, "All four prices are required and must be positive whole numbers of cents");
    }
    if (tooCheapCents > tooExpensiveCents) {
      throw new HttpError(400, "The 'too cheap' price can't be higher than the 'too expensive' price");
    }

    await prisma.priceSurveyResponse.create({
      data: {
        surveyId: survey.id,
        tooCheapCents,
        goodValueCents,
        gettingExpensiveCents,
        tooExpensiveCents,
      },
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName(survey.id), "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  },
);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- "src/app/api/survey/[token]/respond/route.test.ts"`
Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/survey/[token]/respond/route.ts" "src/app/api/survey/[token]/respond/route.test.ts"
git commit -m "feat: add public survey response API with rate limiting and anti-resubmit cookie"
```

---

## Task 5: Survey results API

**Goal:** Compute and return the Van Westendorp results for a specific survey.

**Files:**
- Create: `src/app/api/products/[id]/surveys/[surveyId]/results/route.ts`
- Test: `src/app/api/products/[id]/surveys/[surveyId]/results/route.test.ts`

**Acceptance Criteria:**
- [ ] Returns 404 if the product isn't owned by the caller, or the survey doesn't belong to that product
- [ ] Returns the `VanWestendorpResult` shape computed from that survey's responses

**Verify:** `npm test -- "src/app/api/products/[id]/surveys/[surveyId]/results/route.test.ts"` → all pass

**Steps:**

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/products/[id]/surveys/[surveyId]/results/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique: vi.fn() },
    priceSurvey: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

function req(): Request {
  return {} as unknown as Request;
}

function ctx(id: string, surveyId: string) {
  return { params: Promise.resolve({ id, surveyId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/products/[id]/surveys/[surveyId]/results", () => {
  it("returns 404 when the product isn't owned by the caller", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req(), ctx("p1", "s1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the survey doesn't belong to the product", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ merchantId: "m1" });
    (prisma.priceSurvey.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req(), ctx("p1", "s1"));
    expect(res.status).toBe(404);
  });

  it("returns the computed Van Westendorp result for the survey's responses", async () => {
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ merchantId: "m1" });
    (prisma.priceSurvey.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      responses: [
        { tooCheapCents: 500, goodValueCents: 1000, gettingExpensiveCents: 1500, tooExpensiveCents: 2000 },
      ],
    });

    const res = await GET(req(), ctx("p1", "s1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      pointOfMarginalCheapness: 1000,
      pointOfMarginalExpensiveness: 1500,
      optimalPricePoint: 1000,
      indifferencePricePoint: 1250,
      acceptableRange: { min: 1000, max: 1500 },
      responseCount: 1,
      confidence: "none",
    });
    expect(prisma.priceSurvey.findFirst).toHaveBeenCalledWith({
      where: { id: "s1", productId: "p1" },
      include: { responses: true },
    });
  });
});
```

- [ ] **Step 2: Run to confirm it fails, then write the route**

```typescript
// src/app/api/products/[id]/surveys/[surveyId]/results/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { calculateVanWestendorp } from "@/lib/priceSurvey/vanWestendorp";

export const GET = withErrorHandling(
  async (
    _req: Request,
    { params }: { params: Promise<{ id: string; surveyId: string }> },
  ) => {
    const { merchantId } = await requireSessionApi();
    const { id: productId, surveyId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { merchantId: true },
    });
    if (!product || product.merchantId !== merchantId) {
      throw new HttpError(404, "Not found");
    }

    const survey = await prisma.priceSurvey.findFirst({
      where: { id: surveyId, productId },
      include: { responses: true },
    });
    if (!survey) throw new HttpError(404, "Survey not found");

    const result = calculateVanWestendorp(survey.responses);
    return NextResponse.json(result);
  },
);
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- "src/app/api/products/[id]/surveys/[surveyId]/results/route.test.ts"`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/products/[id]/surveys/[surveyId]/results/route.ts" "src/app/api/products/[id]/surveys/[surveyId]/results/route.test.ts"
git commit -m "feat: add survey results API computing Van Westendorp intersections"
```

---

## Task 6: Public survey page

**Goal:** The standalone, no-app-chrome page a customer sees when they follow the survey link.

**Files:**
- Create: `src/app/survey/[token]/page.tsx`

**Acceptance Criteria:**
- [ ] Page renders without `AppShell`/sidebar — no authenticated dashboard chrome visible to a public respondent
- [ ] Shows the product title/image, four price inputs with standard Van Westendorp wording, and a submit button
- [ ] On success, shows a thank-you state instead of the form
- [ ] On a 409 (already responded) or 429 (rate limited) response, shows a clear message instead of a generic error

**Verify:** Manual check in the browser (this is a page component; no dedicated component test per this codebase's existing selective test-coverage convention — covered by the API route tests already written in Tasks 4–5).

**Steps:**

- [ ] **Step 1: Write the page**

```tsx
// src/app/survey/[token]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface SurveyInfo {
  productTitle: string;
  productImageUrl: string | null;
}

type FieldKey = "tooCheapCents" | "goodValueCents" | "gettingExpensiveCents" | "tooExpensiveCents";

const QUESTIONS: { key: FieldKey; label: string }[] = [
  { key: "tooCheapCents", label: "At what price would this be so cheap you'd doubt its quality?" },
  { key: "goodValueCents", label: "At what price would this be a bargain — great value for the money?" },
  { key: "gettingExpensiveCents", label: "At what price would this start to feel expensive, but you'd still consider buying it?" },
  { key: "tooExpensiveCents", label: "At what price would this be too expensive to consider buying?" },
];

type Status = "loading" | "not-found" | "ready" | "submitting" | "done" | "already-responded" | "rate-limited" | "error";

export default function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<SurveyInfo | null>(null);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    tooCheapCents: "",
    goodValueCents: "",
    gettingExpensiveCents: "",
    tooExpensiveCents: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/survey/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data) {
          setInfo(data);
          setStatus("ready");
        } else {
          setStatus("not-found");
        }
      })
      .catch(() => active && setStatus("not-found"));
    return () => {
      active = false;
    };
  }, [token]);

  function dollarsToCents(raw: string): number | null {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed: Record<FieldKey, number | null> = {
      tooCheapCents: dollarsToCents(values.tooCheapCents),
      goodValueCents: dollarsToCents(values.goodValueCents),
      gettingExpensiveCents: dollarsToCents(values.gettingExpensiveCents),
      tooExpensiveCents: dollarsToCents(values.tooExpensiveCents),
    };
    if (Object.values(parsed).some((v) => v === null)) {
      setError("Please enter a valid price for every question.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`/api/survey/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (res.status === 409) {
        setStatus("already-responded");
        return;
      }
      if (res.status === 429) {
        setStatus("rate-limited");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Something went wrong — please try again.");
        setStatus("ready");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network error — please try again.");
      setStatus("ready");
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {status === "loading" && <p className="text-sm text-muted">Loading…</p>}

        {status === "not-found" && (
          <p className="text-sm text-muted">This survey link isn&apos;t valid or has been removed.</p>
        )}

        {status === "already-responded" && (
          <p className="text-sm text-muted">You&apos;ve already responded to this survey. Thanks again!</p>
        )}

        {status === "rate-limited" && (
          <p className="text-sm text-muted">Too many submissions right now — please try again in a few minutes.</p>
        )}

        {status === "done" && (
          <p className="text-sm text-ink">Thanks for your feedback!</p>
        )}

        {(status === "ready" || status === "submitting") && info && (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-ink">{info.productTitle}</h1>
              <p className="mt-1 text-sm text-muted">Help us price this fairly — a few quick questions.</p>
            </div>
            {QUESTIONS.map((q) => (
              <label key={q.key} className="block">
                <span className="text-sm text-muted">{q.label}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={values[q.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [q.key]: e.target.value }))}
                  disabled={status === "submitting"}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </label>
            ))}
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

Note: `formatCents` is imported but unused in this component as written — remove the import if you don't end up using it (e.g. if you decide not to echo back a formatted price anywhere on this page). Keep the page free of unused imports.

- [ ] **Step 2: Manually verify in the browser**

Start the dev server, create a survey via the product page (once Task 7 lands) or directly via `POST /api/products/[id]/surveys` with an authenticated session, then visit the returned `/survey/[token]` URL in an incognito window (to confirm no session/app-chrome leaks through) and submit the form.

- [ ] **Step 3: Commit**

```bash
git add "src/app/survey/[token]/page.tsx"
git commit -m "feat: add public price-sensitivity survey page"
```

---

## Task 7: Product page integration — survey card + chart

**Goal:** Let a merchant create a survey and see its results from the product detail page.

**Files:**
- Create: `src/components/PriceSensitivityChart.tsx`
- Create: `src/components/PriceSurveyCard.tsx`
- Modify: `src/app/product/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Product page shows a "Price Sensitivity Survey" card alongside (not replacing) the existing `RecommendationCard`
- [ ] Empty state offers a "Create survey link" action; active state shows a copyable share link and response count
- [ ] Once a survey has ≥5 responses, the price-sensitivity chart renders with a visible confidence label
- [ ] Chart is pure SVG, no new charting library dependency

**Verify:** Manual check in the browser — create a survey, submit a few responses via the public page from Task 6, confirm the chart and confidence label update.

**Steps:**

- [ ] **Step 1: Write the chart component**

```tsx
// src/components/PriceSensitivityChart.tsx
"use client";

import { formatCents } from "@/lib/money";
import type { VanWestendorpResult } from "@/lib/priceSurvey/vanWestendorp";

const W = 480;
const H = 100;
const PAD = { left: 16, right: 16 };
const TRACK_W = W - PAD.left - PAD.right;

const CONFIDENCE_LABEL: Record<VanWestendorpResult["confidence"], string> = {
  none: "Not enough responses yet",
  low: "Low confidence — share the link further",
  good: "Good confidence",
};

export function PriceSensitivityChart({ result }: { result: VanWestendorpResult }) {
  const { acceptableRange, optimalPricePoint, indifferencePricePoint, confidence, responseCount } = result;

  const lo = Math.min(acceptableRange.min, optimalPricePoint) * 0.85;
  const hi = Math.max(acceptableRange.max, optimalPricePoint) * 1.15 || 1;
  const span = hi - lo || 1;

  const toX = (price: number) => PAD.left + ((price - lo) / span) * TRACK_W;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          Acceptable range: {formatCents(acceptableRange.min)} – {formatCents(acceptableRange.max)}
        </span>
        <span
          className={`text-xs font-medium ${confidence === "good" ? "text-positive" : confidence === "low" ? "text-warning" : "text-faint"}`}
        >
          {CONFIDENCE_LABEL[confidence]} ({responseCount} response{responseCount === 1 ? "" : "s"})
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Price sensitivity chart">
        <line x1={PAD.left} y1={H / 2} x2={W - PAD.right} y2={H / 2} stroke="var(--color-line)" strokeWidth="2" />
        <rect
          x={toX(acceptableRange.min)}
          y={H / 2 - 6}
          width={Math.max(0, toX(acceptableRange.max) - toX(acceptableRange.min))}
          height="12"
          rx="6"
          fill="var(--color-accent)"
          opacity="0.15"
        />
        <line x1={toX(optimalPricePoint)} y1={H / 2 - 18} x2={toX(optimalPricePoint)} y2={H / 2 + 18} stroke="var(--color-accent)" strokeWidth="2" />
        <text x={toX(optimalPricePoint)} y={H / 2 - 24} textAnchor="middle" fontSize="9" fill="var(--color-accent)" fontFamily="var(--font-geist-mono, monospace)">
          Optimal {formatCents(optimalPricePoint)}
        </text>
        <line x1={toX(indifferencePricePoint)} y1={H / 2 - 12} x2={toX(indifferencePricePoint)} y2={H / 2 + 12} stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="3 3" />
        <text x={toX(indifferencePricePoint)} y={H / 2 + 30} textAnchor="middle" fontSize="9" fill="var(--color-faint)" fontFamily="var(--font-geist-mono, monospace)">
          Indifference {formatCents(indifferencePricePoint)}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Write the card component**

```tsx
// src/components/PriceSurveyCard.tsx
"use client";

import { useEffect, useState } from "react";
import { PriceSensitivityChart } from "./PriceSensitivityChart";
import type { VanWestendorpResult } from "@/lib/priceSurvey/vanWestendorp";

interface SurveySummary {
  id: string;
  shareUrl: string;
  createdAt: string;
  responseCount: number;
}

export function PriceSurveyCard({ productId }: { productId: string }) {
  const [surveys, setSurveys] = useState<SurveySummary[] | null>(null);
  const [results, setResults] = useState<VanWestendorpResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSurveys() {
    const res = await fetch(`/api/products/${productId}/surveys`);
    if (!res.ok) return;
    const data: SurveySummary[] = await res.json();
    setSurveys(data);
    if (data.length > 0) {
      const latest = data[0];
      const resultsRes = await fetch(`/api/products/${productId}/surveys/${latest.id}/results`);
      if (resultsRes.ok) setResults(await resultsRes.json());
    }
  }

  useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function createSurvey() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/surveys`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create survey link");
      }
      await fetchSurveys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create survey link");
    } finally {
      setCreating(false);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (surveys === null) {
    return <div className="h-32 animate-pulse rounded-xl border border-line bg-panel" />;
  }

  const latest = surveys[0] ?? null;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">Price sensitivity survey</h3>
      <p className="mt-0.5 text-xs text-muted">
        Ask your customers directly what they&apos;d pay — share this link however you already reach them.
      </p>

      {!latest && (
        <button onClick={createSurvey} disabled={creating} className="btn mt-4">
          {creating ? "Creating…" : "Create survey link"}
        </button>
      )}

      {latest && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={latest.shareUrl}
              className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted"
            />
            <button onClick={() => copyLink(latest.shareUrl)} className="btn btn-ghost text-xs">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {results && results.responseCount > 0 ? (
            results.responseCount >= 5 ? (
              <PriceSensitivityChart result={results} />
            ) : (
              <p className="text-xs text-faint">
                {results.responseCount} response{results.responseCount === 1 ? "" : "s"} so far — need at least 5 before showing the chart.
              </p>
            )
          ) : (
            <p className="text-xs text-faint">No responses yet.</p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Wire into the product detail page**

Read `src/app/product/[id]/page.tsx` in full first to see its current layout (it renders `RecommendationCard`, `DemandCurve`, `WhatIfSlider`, `PriceHistory`, `PromotionFlags`, `SalesHistoryUpload` in sequence inside `AppShell`). Add the import:

```typescript
import { PriceSurveyCard } from "@/components/PriceSurveyCard";
```

Add `<PriceSurveyCard productId={id} />` right after the `<RecommendationCard rec={...} />` usage in the JSX, using whatever the page's existing product-id variable is named (check the actual variable — likely `id` from the route params, matching the pattern already used to fetch other product-scoped data on this page).

- [ ] **Step 4: Run the full test suite**

```bash
cd /c/Users/pohde/projects/zorin
npm test
```

Expected: all suites pass, no regressions.

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`), open a product detail page, click "Create survey link," copy the URL, open it in an incognito window, submit a response, return to the product page and confirm the response count updates. Repeat 4 more times (5 total) to cross the chart-visibility threshold and confirm the chart renders.

- [ ] **Step 6: Commit**

```bash
git add src/components/PriceSensitivityChart.tsx src/components/PriceSurveyCard.tsx "src/app/product/[id]/page.tsx"
git commit -m "feat: add price-sensitivity survey card and chart to the product page"
```

---

## Post-implementation notes

- No database migration risk analogous to the earlier `shopDomain` unique-constraint concern — both new tables are entirely new, so there's no existing-data collision to check before deploying.
- Once merged, this needs the same production `prisma db push --schema=prisma/schema.production.prisma` step documented elsewhere in the project's handover notes before the feature works live — code deploy alone does not migrate the production database.
