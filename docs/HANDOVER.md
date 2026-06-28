# PriceIQ — Handover Doc

**Date:** 2026-06-28
**Project root:** `C:\Users\pohde\projects\priceiq`
**Current branch:** `slice1-implementation` (branched off `master`)
**Status:** Planning complete. Implementation NOT started (blocked on tool permissions).

---

## 1. What PriceIQ is

An AI-native pricing SaaS for online store owners (Shopify + general ecommerce): tracks
competitor prices, analyzes margins, and gives plain-English "raise / lower / hold"
recommendations. The full product is a 6-subsystem platform (store ingestion, competitor
discovery, scraping, analytics engine, AI recommendations, dashboard/auth/billing).

We deliberately scoped down to a **thin vertical slice** to prove the core value first.

## 2. What we decided (Slice 1 scope)

Build one merchant flow end-to-end against **seeded mock data**:

- Enter/seed a store → see your products with current price, COGS input, computed margin
- Compare each product to tracked competitors (median / min / position)
- Get one AI pricing recommendation per product (**rules decide, LLM only phrases**)
- What-if price slider (live client-side margin/position)
- Data-confidence indicator (competitor count + freshness)
- Margin-floor warning badge + revenue-opportunity column

**Key decisions locked in:**
- Stack: **Next.js 15 (App Router) + TypeScript + Prisma + SQLite + Vitest + Tailwind**
- AI: rules engine produces a structured `Decision`; **Claude (`claude-haiku-4-5`) only phrases
  it**, with a deterministic fallback so the app never depends on the network/API key
- **Money stored as integer cents** everywhere
- **Single seeded merchant, no auth** in this slice
- Margin floor default **15%**; **margin-floor rule wins** over competitive-position rules
- On COGS update: **invalidate cached recommendation**, regenerate on demand
- Slider range: **±50%** of current price
- Revenue-opportunity shows **"—"** when estUnits or median is null

**Explicitly deferred (each its own future spec → plan → build):** category benchmarking,
discount/net-revenue analysis, real scraping, Shopify OAuth, competitor discovery,
price-change alerts, repricing automation, multi-tenant auth, billing.

## 3. Artifacts (committed on `slice1-implementation`)

- **Spec:** `docs/specs/2026-06-28-priceiq-slice1-design.md`
- **Implementation plan:** `docs/plans/2026-06-28-priceiq-slice1.md` — 13 bite-sized TDD tasks
  (Task 0 scaffold → Task 12 verification), each with exact files, full code, and commands.
- **This handover:** `docs/HANDOVER.md`

Git log:
```
d8c5b3f Add Slice 1 implementation plan
1132c5a Add Slice 1 design spec for PriceIQ
```
(Plus this handover commit, if committed.)

## 4. Current repo state

```
C:\Users\pohde\projects\priceiq
├── .git/                  (branch: slice1-implementation)
└── docs/
    ├── HANDOVER.md
    ├── plans/2026-06-28-priceiq-slice1.md
    └── specs/2026-06-28-priceiq-slice1-design.md
```

**No application code exists yet.** No `package.json`, no `node_modules`, no scaffold.
The repo is clean (no uncommitted changes besides possibly this file).

## 5. Why implementation hasn't started (the blocker)

We chose subagent-driven execution. The implementer subagent could not run **any** command —
even a read-only `ls` was rejected at the **permission layer**. Direct execution from the main
session was also interrupted/rejected. So Task 0 (scaffold) never ran.

This is a permissions/harness issue, not a plan or code problem. **Nothing failed; nothing was
lost.**

## 6. How to resume (pick one)

**Option A — approve commands as they come (simplest):**
Re-run the plan and approve each permission prompt (`npx create-next-app`, `npm install`,
`git commit`, etc.) as it appears.

**Option B — bypass-permissions mode:**
Press `Shift+Tab` to cycle permission mode to "bypass permissions", or restart with
`claude --dangerously-skip-permissions`. Then execution runs without prompts. (Reasonable here:
isolated greenfield folder, low risk. Note: it persists for the whole session and removes ALL
prompts, including destructive ones.)

**Then, the very first step is Task 0 in the plan.** Run from `C:\Users\pohde\projects\priceiq`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --use-npm --yes
npm install prisma @prisma/client @anthropic-ai/sdk
npm install -D vitest @vitejs/plugin-react tsx
```
(create-next-app must preserve `docs/` and `.git`. If it refuses on the non-empty dir, scaffold
into a temp subdir and move files up — never delete `docs/` or `.git`.)

Then continue Tasks 1–12 in `docs/plans/2026-06-28-priceiq-slice1.md` in order. Each task is
test-first (TDD), self-contained, with a commit at the end.

## 7. Recommended execution method on resume

The plan was written for **superpowers:subagent-driven-development** (fresh subagent per task +
two-stage review). That requires the subagent's tool calls to be permitted. If subagent tool
calls keep getting denied, fall back to **inline execution** (superpowers:executing-plans) from
the main session, approving prompts directly — same plan, same TDD discipline, just no subagent
delegation.

## 8. Definition of done for Slice 1

- `npm test` — all unit tests pass (money, margin, comparison, recommendation, fallback, phrase)
- `npm run build` — succeeds, no type errors
- `npm run seed` then `npm run dev` — products table renders 8 seeded products with editable
  COGS, margins, positions, opportunity; product detail shows competitors, working what-if
  slider, and a recommendation (sensible even with no `ANTHROPIC_API_KEY` via fallback)
- Final code review (whole implementation), then finish the branch (merge/PR) via
  superpowers:finishing-a-development-branch
