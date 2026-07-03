import type { ScrapeResult } from "../scrape/scrapeOne";
import { scrapeOne as defaultScrapeOne } from "../scrape/scrapeOne";
import { normalizeDomain } from "./domain";
import type { SearchProvider } from "./searchProvider";

export type DiscoveryMode = "saved" | "open" | "both";

export interface DiscoveryInput {
  productTitle: string;
  currentPriceCents: number;
  ownDomain: string | null; // normalized merchant storeUrl domain, if any
  savedDomains: string[];
  existingCompetitorDomains: string[]; // domains already tracked for this product
  mode: DiscoveryMode;
}

export interface Candidate {
  url: string;
  domain: string;
  title: string;
  priceCents: number;
}

export interface DiscoveryOutput {
  candidates: Candidate[];
  skipped: { url: string; reason: string }[];
  providerError?: string;
}

interface Deps {
  provider: SearchProvider;
  scrapeOne?: (url: string, lastCents: number | null) => Promise<ScrapeResult>;
}

const MAX_CANDIDATES = 8;
const BAND_LOW = 0.1;
const BAND_HIGH = 10;

export function buildQueries(input: DiscoveryInput): string[] {
  const queries: string[] = [];
  if (input.mode !== "open") {
    for (const d of input.savedDomains) queries.push(`"${input.productTitle}" site:${d}`);
  }
  if (input.mode !== "saved") {
    queries.push(`"${input.productTitle}" buy price`);
  }
  return queries;
}

export async function discoverCompetitors(
  input: DiscoveryInput,
  deps: Deps,
): Promise<DiscoveryOutput> {
  const scrape = deps.scrapeOne ?? defaultScrapeOne;
  const skipped: DiscoveryOutput["skipped"] = [];

  const merged: { url: string; title: string }[] = [];
  for (const q of buildQueries(input)) {
    const res = await deps.provider.search(q);
    if (!res.ok) {
      return { candidates: [], skipped: [], providerError: res.reason };
    }
    merged.push(...res.results);
  }

  const excluded = new Set([
    ...(input.ownDomain ? [input.ownDomain] : []),
    ...input.existingCompetitorDomains,
  ]);
  const seen = new Set<string>();
  const toVerify: { url: string; domain: string; title: string }[] = [];
  for (const r of merged) {
    const domain = normalizeDomain(r.url);
    if (domain === null) {
      skipped.push({ url: r.url, reason: "bad_url" });
      continue;
    }
    if (excluded.has(domain) || seen.has(domain)) continue;
    seen.add(domain);
    toVerify.push({ url: r.url, domain, title: r.title });
    if (toVerify.length >= MAX_CANDIDATES) break;
  }

  const candidates: Candidate[] = [];
  for (const c of toVerify) {
    const res = await scrape(c.url, null);
    if (!res.ok) {
      skipped.push({ url: c.url, reason: res.reason });
      continue;
    }
    const own = input.currentPriceCents;
    if (own > 0 && (res.priceCents < own * BAND_LOW || res.priceCents > own * BAND_HIGH)) {
      skipped.push({ url: c.url, reason: "implausible" });
      continue;
    }
    candidates.push({ ...c, priceCents: res.priceCents });
  }

  return { candidates, skipped };
}
