import { fixtureProvider } from "./fixtureProvider";
import { makeBraveProvider } from "./braveProvider";

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export type SearchProviderResult =
  | { ok: true; results: SearchResult[] }
  | { ok: false; reason: "unavailable" | "rate_limited" | "http_error" | "network_error" };

export interface SearchProvider {
  name: string;
  search(query: string): Promise<SearchProviderResult>;
}

// Provider selection: explicit fixture override, then Brave when a key exists,
// otherwise null — the discover route turns null into a 503 "no_provider".
export function getSearchProvider(): SearchProvider | null {
  if (process.env.SEARCH_PROVIDER === "fixture") {
    return fixtureProvider;
  }
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (key) {
    return makeBraveProvider(key);
  }
  return null;
}
