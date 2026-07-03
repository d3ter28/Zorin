import { extractPrice } from "./extractPrice";
import { fetchPage as defaultFetchPage, type FetchResult } from "./fetcher";

export type ScrapeFailureReason =
  | `http_${number}`
  | "timeout"
  | "no_price_found"
  | "implausible"
  | "blocked_url";

export type ScrapeResult =
  | { ok: true; priceCents: number }
  | { ok: false; reason: ScrapeFailureReason };

// A new price is plausible if within 1/5×..5× of the last known price.
const PLAUSIBLE_FACTOR = 5;

export function isPlausible(candidateCents: number, lastCents: number | null): boolean {
  if (lastCents === null || lastCents <= 0) return true; // no baseline yet
  return (
    candidateCents >= lastCents / PLAUSIBLE_FACTOR &&
    candidateCents <= lastCents * PLAUSIBLE_FACTOR
  );
}

interface Deps {
  fetchPage: (url: string) => Promise<FetchResult>;
}

// Fetch one competitor URL and extract its price. lastCents gates the plausibility check
// (null on first scrape). Returns failure as data, never throws.
export async function scrapeOne(
  url: string,
  lastCents: number | null,
  deps: Deps = { fetchPage: defaultFetchPage },
): Promise<ScrapeResult> {
  const res = await deps.fetchPage(url);
  if (!res.ok) {
    if (res.blocked) return { ok: false, reason: "blocked_url" };
    return { ok: false, reason: res.status === 0 ? "timeout" : `http_${res.status}` };
  }
  const priceCents = extractPrice(res.html);
  if (priceCents === null) return { ok: false, reason: "no_price_found" };
  if (!isPlausible(priceCents, lastCents)) return { ok: false, reason: "implausible" };
  return { ok: true, priceCents };
}
