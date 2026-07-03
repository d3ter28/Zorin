# DNS-Rebinding TOCTOU Fix — Connection-Level IP Pinning

**Date:** 2026-07-03
**Status:** Approved for implementation

## Problem

The SSRF guard (`src/lib/scrape/urlGuard.ts`) resolves DNS at validate time; `fetch` then re-resolves at connect time. An attacker-controlled DNS server can return a public IP for the first lookup and a private IP for the second (DNS rebinding), bypassing the guard. This was accepted residual risk in the SSRF hardening work; this spec closes it.

## Approach

Validate the IP at the moment the socket connects, by giving undici a custom `lookup` function. Because the checked addresses are the exact addresses the socket uses, there is no time-of-check/time-of-use gap. Hostname is preserved for TLS/SNI and the Host header — we never rewrite URLs to IPs.

The pre-flight `validateScrapeUrl` DNS check stays as-is (cheap early rejection with clear reason codes); connection-level pinning is the authoritative backstop.

## Components

### New: `src/lib/scrape/pinnedAgent.ts`

- **`PrivateIpError extends Error`** — thrown when a connection would target a private IP. `name = "PrivateIpError"`.
- **`guardedLookup(hostname, opts, cb)`** — `dns.lookup`-compatible. Delegates to Node's `dns.lookup`, then:
  - if **any** resolved address is private per `isPrivateIp` (from `urlGuard.ts`), calls `cb` with a `PrivateIpError`;
  - otherwise passes results through unchanged.
  - Injectable base-lookup seam for tests (module accepts an optional deps parameter or exported factory).
- **`getPinnedAgent()`** — lazy module-level singleton `undici.Agent` constructed with `connect: { lookup: guardedLookup }`. Lazy so importing the module allocates nothing (matches existing lazy-import discipline in `autoRefresh.ts`).
- **`isPrivateIpError(err)`** — returns true if `err` or anything in its `cause` chain is a `PrivateIpError` (Node fetch wraps connector failures in `TypeError: fetch failed` with the real error as `cause`).

### Modified: `src/lib/scrape/fetcher.ts`

- `fetchOnce(url, pin)` — when `pin` is true, pass `dispatcher: getPinnedAgent()` in the `fetch` RequestInit (Node fetch accepts undici's `dispatcher`).
- `fetchPage` computes `pin = !allowPrivate`. Dev/demo (`allowPrivate` true — `NODE_ENV !== "production"` or `SCRAPE_ALLOW_PRIVATE=1`) uses the default dispatcher; behavior completely unchanged.
- Error handling in `fetchOnce`: if the caught error satisfies `isPrivateIpError`, return `{ kind: "blocked" }` — **no retry**, same policy as timeout. `fetchPage` maps `blocked` to the existing frozen `BLOCKED` sentinel, so it surfaces as `blocked_url` in refresh results.

### Unchanged

- `urlGuard.ts` — pre-flight validation per hop stays.
- `scrapeOne.ts` — already maps `res.blocked` to `blocked_url`.
- Redirect handling — every hop is pre-flight-validated and every hop's connection is pinned.

## Testing

- **`pinnedAgent.test.ts`**
  - `guardedLookup`: public-only records pass through unchanged; a private record fails with `PrivateIpError`; mixed public+private fails; base-lookup errors propagate.
  - `isPrivateIpError`: direct instance → true; nested as `cause` (one and two levels) → true; unrelated Error / non-Error → false.
- **`fetcher.test.ts` additions**
  - Stubbed fetch throws `TypeError("fetch failed", { cause: new PrivateIpError(...) })` → `fetchPage` returns `BLOCKED`, fetch called exactly once (no retry).
  - When pinning is active, `fetch` receives a `dispatcher`; when `allowPrivate` is true, it does not.
- No integration test hitting real DNS — the lookup seam keeps everything offline, consistent with the rest of the suite.

## Out of scope

- Rate limiting, robots.txt, proxy support.
- Rewriting pre-flight guard behavior or reason codes.

## Docs

Update `docs/HANDOVER.md`: remove the residual-risk item from Next steps; note pinning in the gotchas section.
