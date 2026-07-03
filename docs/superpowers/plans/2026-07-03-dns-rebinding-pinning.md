# DNS-Rebinding Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the DNS-rebinding TOCTOU in the scrape pipeline by validating IPs at socket-connect time via a custom undici Agent lookup.

**Architecture:** New `src/lib/scrape/pinnedAgent.ts` exports a guarded `dns.lookup` wrapper (rejects private IPs with `PrivateIpError`), a lazy singleton undici `Agent` using it, and an error detector that walks `cause` chains. `fetcher.ts` passes the agent as `dispatcher` when `allowPrivate` is false and maps pinning failures to the existing `BLOCKED` sentinel (surfaces as `blocked_url`). Pre-flight `validateScrapeUrl` stays unchanged as defense-in-depth.

**Tech Stack:** TypeScript, undici 7 (new direct dep), Vitest 4 (node project), existing `isPrivateIp` from `urlGuard.ts`.

**Spec:** `docs/superpowers/specs/2026-07-03-dns-rebinding-pinning-design.md`

**Environment notes (read first):**
- All Bash commands run from the user's home dir — **always prefix with `cd /c/Users/pohde/projects/priceiq && `**.
- Run only the unit project during tasks: `npx vitest run --project unit src/lib/scrape/<file>` (full suite at the end: `npm test`, expect 251 existing + new).
- Comments in this repo use `//` style, never docblocks.

---

### Task 1: `PrivateIpError` + `isPrivateIpError`

**Files:**
- Create: `src/lib/scrape/pinnedAgent.ts`
- Test: `src/lib/scrape/pinnedAgent.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/scrape/pinnedAgent.test.ts
import { describe, expect, it } from "vitest";
import { PrivateIpError, isPrivateIpError } from "./pinnedAgent";

describe("isPrivateIpError", () => {
  it("detects a direct PrivateIpError", () => {
    expect(isPrivateIpError(new PrivateIpError("internal.example", "10.0.0.5"))).toBe(true);
  });

  it("detects a PrivateIpError nested one level deep in cause", () => {
    const err = new TypeError("fetch failed", {
      cause: new PrivateIpError("internal.example", "127.0.0.1"),
    });
    expect(isPrivateIpError(err)).toBe(true);
  });

  it("detects a PrivateIpError nested two levels deep in cause", () => {
    const inner = new PrivateIpError("internal.example", "192.168.1.1");
    const mid = new Error("connect failed", { cause: inner });
    const outer = new TypeError("fetch failed", { cause: mid });
    expect(isPrivateIpError(outer)).toBe(true);
  });

  it("returns false for unrelated errors and non-errors", () => {
    expect(isPrivateIpError(new Error("ECONNRESET"))).toBe(false);
    expect(isPrivateIpError(new TypeError("fetch failed", { cause: new Error("boom") }))).toBe(false);
    expect(isPrivateIpError("nope")).toBe(false);
    expect(isPrivateIpError(undefined)).toBe(false);
  });

  it("includes hostname and address in the message", () => {
    const err = new PrivateIpError("internal.example", "10.0.0.5");
    expect(err.message).toContain("internal.example");
    expect(err.message).toContain("10.0.0.5");
    expect(err.name).toBe("PrivateIpError");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/pinnedAgent.test.ts`
Expected: FAIL — cannot resolve `./pinnedAgent`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/scrape/pinnedAgent.ts

// Thrown by the pinned connection layer when a socket would target a private IP.
export class PrivateIpError extends Error {
  constructor(hostname: string, address: string) {
    super(`refusing to connect: ${hostname} resolved to private address ${address}`);
    this.name = "PrivateIpError";
  }
}

// fetch wraps connector errors ("TypeError: fetch failed" with the real error as
// cause) — walk the cause chain to find our marker. Depth-capped to stay safe on cycles.
export function isPrivateIpError(err: unknown): boolean {
  let current = err;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (current.name === "PrivateIpError") return true;
    current = current.cause;
  }
  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/pinnedAgent.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/pinnedAgent.ts src/lib/scrape/pinnedAgent.test.ts && git commit -m "feat: PrivateIpError marker + cause-chain detector for pinned connections"
```

---

### Task 2: `makeGuardedLookup`

**Files:**
- Modify: `src/lib/scrape/pinnedAgent.ts` (append)
- Modify: `src/lib/scrape/pinnedAgent.test.ts` (append)

Background for the implementer: undici's `Agent` accepts `connect: { lookup }`, forwarded to `net.connect`, which calls `lookup(hostname, options, callback)`. The callback is `dns.lookup`-style: `(err, address, family)` normally, or `(err, addresses[])` when `options.all` is true (addresses are `{ address, family }` objects). The wrapper must handle both shapes and pass results through **unchanged** on success.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/scrape/pinnedAgent.test.ts`:

```ts
import { makeGuardedLookup } from "./pinnedAgent";
import type { LookupFn } from "./pinnedAgent";

// Promisify a guarded lookup call for assertions.
function callLookup(
  lookup: LookupFn,
  hostname: string,
  options: Record<string, unknown> = {},
): Promise<{ err: unknown; result: unknown; family: unknown }> {
  return new Promise((resolve) => {
    (lookup as (h: string, o: object, cb: (...args: unknown[]) => void) => void)(
      hostname,
      options,
      (err, result, family) => resolve({ err, result, family }),
    );
  });
}

// Base lookup stub answering with a single (address, family) pair.
function baseSingle(address: string): LookupFn {
  return ((_h: string, _o: object, cb: (...args: unknown[]) => void) =>
    cb(null, address, 4)) as unknown as LookupFn;
}

// Base lookup stub answering with an all:true style address array.
function baseAll(addresses: string[]): LookupFn {
  return ((_h: string, _o: object, cb: (...args: unknown[]) => void) =>
    cb(null, addresses.map((address) => ({ address, family: 4 })))) as unknown as LookupFn;
}

describe("makeGuardedLookup", () => {
  it("passes a public single address through unchanged", async () => {
    const lookup = makeGuardedLookup(baseSingle("93.184.216.34"));
    const { err, result, family } = await callLookup(lookup, "shop.example");
    expect(err).toBeNull();
    expect(result).toBe("93.184.216.34");
    expect(family).toBe(4);
  });

  it("fails with PrivateIpError for a private single address", async () => {
    const lookup = makeGuardedLookup(baseSingle("10.0.0.5"));
    const { err } = await callLookup(lookup, "internal.example");
    expect(isPrivateIpError(err)).toBe(true);
  });

  it("passes an all-public address array through unchanged", async () => {
    const lookup = makeGuardedLookup(baseAll(["93.184.216.34", "1.1.1.1"]));
    const { err, result } = await callLookup(lookup, "shop.example", { all: true });
    expect(err).toBeNull();
    expect(result).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "1.1.1.1", family: 4 },
    ]);
  });

  it("fails when any address in a mixed array is private", async () => {
    const lookup = makeGuardedLookup(baseAll(["93.184.216.34", "192.168.1.7"]));
    const { err } = await callLookup(lookup, "rebind.example", { all: true });
    expect(isPrivateIpError(err)).toBe(true);
  });

  it("propagates base lookup errors untouched", async () => {
    const boom = new Error("ENOTFOUND");
    const failing = ((_h: string, _o: object, cb: (...args: unknown[]) => void) =>
      cb(boom)) as unknown as LookupFn;
    const lookup = makeGuardedLookup(failing);
    const { err } = await callLookup(lookup, "missing.example");
    expect(err).toBe(boom);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/pinnedAgent.test.ts`
Expected: FAIL — `makeGuardedLookup` not exported

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/scrape/pinnedAgent.ts`:

```ts
import { lookup as dnsLookup } from "node:dns";
import { isPrivateIp } from "./urlGuard";

export type LookupFn = typeof dnsLookup;

// dns.lookup wrapper that rejects private results at connect time. Because this
// is the lookup the socket actually uses, the checked IP IS the connected IP —
// no TOCTOU window. Results pass through unchanged when all addresses are public.
export function makeGuardedLookup(base: LookupFn = dnsLookup): LookupFn {
  const guarded = (
    hostname: string,
    options: object,
    callback: (...args: unknown[]) => void,
  ) => {
    (base as unknown as typeof guarded)(hostname, options, (...args: unknown[]) => {
      const [err, result] = args;
      if (err) return callback(err);
      const addresses = Array.isArray(result)
        ? result.map((r) => (typeof r === "string" ? r : (r as { address: string }).address))
        : [result as string];
      const bad = addresses.find((a) => isPrivateIp(a));
      if (bad !== undefined) return callback(new PrivateIpError(hostname, bad));
      callback(...args);
    });
  };
  return guarded as unknown as LookupFn;
}
```

Place the imports at the top of the file with the existing ones.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/pinnedAgent.test.ts`
Expected: 10 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/pinnedAgent.ts src/lib/scrape/pinnedAgent.test.ts && git commit -m "feat: guarded dns.lookup rejecting private IPs at connect time"
```

---

### Task 3: undici dep + `getPinnedAgent` singleton

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/lib/scrape/pinnedAgent.ts` (append)
- Modify: `src/lib/scrape/pinnedAgent.test.ts` (append)

- [ ] **Step 1: Add undici as a direct dependency**

Run: `cd /c/Users/pohde/projects/priceiq && npm install undici@^7`
Expected: succeeds; `package.json` gains `"undici": "^7.x"` (already present transitively, so lockfile churn is small)

- [ ] **Step 2: Write the failing test**

Append to `src/lib/scrape/pinnedAgent.test.ts`:

```ts
import { Agent } from "undici";
import { getPinnedAgent } from "./pinnedAgent";

describe("getPinnedAgent", () => {
  it("returns a lazily created undici Agent singleton", () => {
    const first = getPinnedAgent();
    expect(first).toBeInstanceOf(Agent);
    expect(getPinnedAgent()).toBe(first);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/pinnedAgent.test.ts`
Expected: FAIL — `getPinnedAgent` not exported

- [ ] **Step 4: Write minimal implementation**

Append to `src/lib/scrape/pinnedAgent.ts` (import `Agent` from `"undici"` at the top):

```ts
let pinnedAgent: Agent | undefined;

// Lazy singleton so importing this module allocates nothing (matches the
// lazy-import discipline elsewhere in src/lib/scrape).
export function getPinnedAgent(): Agent {
  if (!pinnedAgent) {
    pinnedAgent = new Agent({ connect: { lookup: makeGuardedLookup() } });
  }
  return pinnedAgent;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/pinnedAgent.test.ts`
Expected: 11 tests PASS

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add package.json package-lock.json src/lib/scrape/pinnedAgent.ts src/lib/scrape/pinnedAgent.test.ts && git commit -m "feat: lazy pinned undici Agent with guarded connect-time lookup"
```

---

### Task 4: wire pinning into `fetchPage`

**Files:**
- Modify: `src/lib/scrape/fetcher.ts`
- Modify: `src/lib/scrape/fetcher.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe("fetchPage", ...)` block in `src/lib/scrape/fetcher.test.ts`:

```ts
  it("returns BLOCKED without retry when the pinned connection rejects a private IP", async () => {
    const { PrivateIpError } = await import("./pinnedAgent");
    const fetchSpy = vi.fn(async () => {
      throw new TypeError("fetch failed", {
        cause: new PrivateIpError("rebind.example", "127.0.0.1"),
      });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const res = await fetchPage("https://rebind.example/p", {
      guardDeps: { lookup: lookupAll("93.184.216.34") },
      allowPrivate: false,
    });
    expect(res).toMatchObject({ ok: false, status: 0, blocked: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no retry on blocked
  });

  it("passes the pinned dispatcher to fetch when private targets are disallowed", async () => {
    const fetchSpy = vi.fn(async () => new Response("<html>ok</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await fetchPage("https://shop.example/p", {
      guardDeps: { lookup: lookupAll("93.184.216.34") },
      allowPrivate: false,
    });
    expect(fetchSpy.mock.calls[0][1].dispatcher).toBeDefined();
  });

  it("omits the dispatcher when allowPrivate is true (demo mode)", async () => {
    const fetchSpy = vi.fn(async () => new Response("<html>demo</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await fetchPage("http://localhost:3000/demo-competitor.html", {
      guardDeps: { lookup: lookupAll("127.0.0.1") },
      allowPrivate: true,
    });
    expect(fetchSpy.mock.calls[0][1].dispatcher).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape/fetcher.test.ts`
Expected: the 3 new tests FAIL (no dispatcher passed; blocked case retries and returns plain failure); the existing 10 PASS

- [ ] **Step 3: Implement**

In `src/lib/scrape/fetcher.ts`:

1. Add import: `import { getPinnedAgent, isPrivateIpError } from "./pinnedAgent";`
2. Extend the `FetchOnce` union and thread a `pin` flag through. Replace `fetchOnce` and its call site so the file's logic becomes:

```ts
type FetchOnce =
  | { kind: "ok"; response: Response }
  | { kind: "error" }
  | { kind: "blocked" };

// One HTTP request with timeout; single retry on thrown network error.
// pin=true routes through the pinned dispatcher (connect-time private-IP checks).
async function fetchOnce(url: string, pin: boolean): Promise<FetchOnce> {
  const first = await attempt(url, pin);
  if (first.kind !== "retryable") return first;
  const second = await attempt(url, pin);
  return second.kind === "retryable" ? { kind: "error" } : second;
}

type Attempt = FetchOnce | { kind: "retryable" };

async function attempt(url: string, pin: boolean): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // undici (Node 24 fetch) surfaces the real status + Location on redirect: "manual" despite spec saying status=0
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "manual",
      signal: controller.signal,
      ...(pin ? { dispatcher: getPinnedAgent() } : {}),
    });
    return { kind: "ok", response };
  } catch (err) {
    if (isPrivateIpError(err)) return { kind: "blocked" }; // pinned guard fired — no retry
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "error" }; // timed out — no retry
    }
    return { kind: "retryable" };
  } finally {
    clearTimeout(timer);
  }
}
```

Note: `dispatcher` is a Node/undici extension to RequestInit not in TS's DOM lib types — if `tsc` complains, type the init as `RequestInit & { dispatcher?: import("undici").Dispatcher }`.

3. In `fetchPage`, replace the `fetchOnce` call block:

```ts
    const res = await fetchOnce(current, !allowPrivate);
    if (res.kind === "blocked") return BLOCKED;
    if (res.kind === "error") return { ok: false, status: 0, html: "" };
```

This refactor collapses the duplicated try/catch retry blocks; behavior for ok/error/timeout paths is unchanged and covered by existing tests.

- [ ] **Step 4: Run the scrape unit tests**

Run: `cd /c/Users/pohde/projects/priceiq && npx vitest run --project unit src/lib/scrape`
Expected: all PASS (13 fetcher tests + pinnedAgent + rest of scrape suite)

- [ ] **Step 5: Typecheck + full suite**

Run: `cd /c/Users/pohde/projects/priceiq && npm run build && npm test`
Expected: build succeeds; 251 + 14 new = 265 tests passing

- [ ] **Step 6: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add src/lib/scrape/fetcher.ts src/lib/scrape/fetcher.test.ts && git commit -m "feat: connect-time IP pinning in fetchPage; rebound DNS surfaces as blocked_url"
```

---

### Task 5: live verification + docs

**Files:**
- Modify: `docs/HANDOVER.md`
- Modify: `src/lib/scrape/fetcher.ts` (comment only)
- Modify: `src/lib/scrape/urlGuard.ts` (comment only)

- [ ] **Step 1: Live-verify the pinned path with real DNS**

`localtest.me` publicly resolves to `127.0.0.1` — a perfect stand-in for a rebinding host. Feed the pre-flight guard a fake public answer so only the connect-time pin can catch it:

```bash
cd /c/Users/pohde/projects/priceiq && npx tsx -e "
import { fetchPage } from './src/lib/scrape/fetcher';
const res = await fetchPage('http://localtest.me/', {
  allowPrivate: false,
  guardDeps: { lookup: async () => [{ address: '93.184.216.34', family: 4 }] },
});
console.log(JSON.stringify(res));
"
```

Expected output: `{"ok":false,"status":0,"html":"","blocked":true}` — the pre-flight guard was deceived but the socket-level pin refused the connection. `blocked:true` must be present to count as verified: if the machine is offline, DNS failure inside connect yields a plain `{"ok":false,"status":0,"html":""}` without `blocked` — re-run when online.

- [ ] **Step 2: Update stale comments**

- `src/lib/scrape/fetcher.ts` line ~28: change `DNS-rebinding TOCTOU is accepted risk for this MVP.` to `DNS rebinding is closed by connect-time IP pinning (pinnedAgent.ts).`
- `src/lib/scrape/urlGuard.ts` line ~55: change `DNS-rebinding TOCTOU is accepted risk.` to `DNS rebinding is closed at connect time by pinnedAgent.ts; this pre-flight check is defense-in-depth.`

- [ ] **Step 3: Update `docs/HANDOVER.md`**

- Section 6 (Next steps): replace item 1 (DNS-rebinding TOCTOU) with `~~DNS-rebinding TOCTOU~~ — closed via connect-time IP pinning (src/lib/scrape/pinnedAgent.ts).` moved into the completed list.
- Section 5 / Phase A bullet in section 3: update the "Accepted residual risk: DNS-rebinding TOCTOU" mentions to note it is now closed.
- Update test counts (251 → 265) in Status line, section 5 Tests bullet, and section 7 (`npm test # expect 265 passing`).

- [ ] **Step 4: Full suite one more time**

Run: `cd /c/Users/pohde/projects/priceiq && npm test`
Expected: 265 passing

- [ ] **Step 5: Commit**

```bash
cd /c/Users/pohde/projects/priceiq && git add docs/HANDOVER.md src/lib/scrape/fetcher.ts src/lib/scrape/urlGuard.ts && git commit -m "docs: DNS-rebinding TOCTOU closed via connect-time pinning; live-verified"
```
