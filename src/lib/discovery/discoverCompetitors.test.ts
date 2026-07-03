import { describe, expect, it, vi } from "vitest";
import { discoverCompetitors, type DiscoveryInput } from "./discoverCompetitors";
import type { SearchProvider } from "./searchProvider";

function provider(resultsByQuery: Record<string, { url: string; title: string }[]>): SearchProvider {
  return {
    name: "test",
    search: vi.fn(async (q: string) => ({
      ok: true as const,
      results: (resultsByQuery[q] ?? []).map((r) => ({ ...r, snippet: "" })),
    })),
  };
}

const okScrape = vi.fn(async () => ({ ok: true as const, priceCents: 1499 }));

function input(overrides: Partial<DiscoveryInput> = {}): DiscoveryInput {
  return {
    productTitle: "Ceramic Mug",
    currentPriceCents: 1500,
    ownDomain: "mystore.example",
    savedDomains: ["walmart.com"],
    existingCompetitorDomains: [],
    mode: "both",
    ...overrides,
  };
}

describe("discoverCompetitors", () => {
  it("builds one site: query per saved domain plus one open query for mode both", async () => {
    const p = provider({});
    await discoverCompetitors(input(), { provider: p, scrapeOne: okScrape });
    const queries = (p.search as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(queries).toContain('"Ceramic Mug" site:walmart.com');
    expect(queries).toContain('"Ceramic Mug" buy price');
    expect(queries).toHaveLength(2);
  });

  it("mode saved skips the open query; mode open skips site: queries", async () => {
    const p1 = provider({});
    await discoverCompetitors(input({ mode: "saved" }), { provider: p1, scrapeOne: okScrape });
    expect((p1.search as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([
      '"Ceramic Mug" site:walmart.com',
    ]);
    const p2 = provider({});
    await discoverCompetitors(input({ mode: "open" }), { provider: p2, scrapeOne: okScrape });
    expect((p2.search as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([
      '"Ceramic Mug" buy price',
    ]);
  });

  it("dedups by domain (keeps first), drops own store and already-tracked domains", async () => {
    const p = provider({
      '"Ceramic Mug" buy price': [
        { url: "https://walmart.com/a", title: "A" },
        { url: "https://www.walmart.com/b", title: "B" }, // dup domain
        { url: "https://mystore.example/self", title: "Self" }, // own store
        { url: "https://tracked.com/x", title: "Tracked" }, // already a competitor
        { url: "https://fresh.com/y", title: "Fresh" },
      ],
    });
    const out = await discoverCompetitors(
      input({ mode: "open", existingCompetitorDomains: ["tracked.com"] }),
      { provider: p, scrapeOne: okScrape },
    );
    expect(out.candidates.map((c) => c.domain)).toEqual(["walmart.com", "fresh.com"]);
  });

  it("caps candidates at 8 before scraping", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      url: `https://shop${i}.com/p`,
      title: `Shop ${i}`,
    }));
    const scrape = vi.fn(async () => ({ ok: true as const, priceCents: 1400 }));
    const out = await discoverCompetitors(
      input({ mode: "open" }),
      { provider: provider({ '"Ceramic Mug" buy price': many }), scrapeOne: scrape },
    );
    expect(scrape).toHaveBeenCalledTimes(8);
    expect(out.candidates).toHaveLength(8);
  });

  it("moves scrape failures and out-of-band prices to skipped with reasons", async () => {
    const p = provider({
      '"Ceramic Mug" buy price': [
        { url: "https://good.com/p", title: "Good" },
        { url: "https://dead.com/p", title: "Dead" },
        { url: "https://cheap.com/p", title: "Cheap" },
        { url: "https://gold.com/p", title: "Gold" },
      ],
    });
    const scrape = vi.fn(async (url: string) => {
      if (url.includes("good")) return { ok: true as const, priceCents: 1450 };
      if (url.includes("dead")) return { ok: false as const, reason: "no_price_found" as const };
      if (url.includes("cheap")) return { ok: true as const, priceCents: 100 }; // < 10% of 1500
      return { ok: true as const, priceCents: 20000 }; // > 10x of 1500
    });
    const out = await discoverCompetitors(input({ mode: "open" }), { provider: p, scrapeOne: scrape });
    expect(out.candidates).toEqual([
      { url: "https://good.com/p", domain: "good.com", title: "Good", priceCents: 1450 },
    ]);
    expect(out.skipped).toEqual([
      { url: "https://dead.com/p", reason: "no_price_found" },
      { url: "https://cheap.com/p", reason: "implausible" },
      { url: "https://gold.com/p", reason: "implausible" },
    ]);
  });

  it("surfaces a provider failure as providerError with empty candidates", async () => {
    const p: SearchProvider = {
      name: "test",
      search: async () => ({ ok: false, reason: "rate_limited" }),
    };
    const out = await discoverCompetitors(input({ mode: "open" }), { provider: p, scrapeOne: okScrape });
    expect(out).toEqual({ candidates: [], skipped: [], providerError: "rate_limited" });
  });

  it("drops results with unparseable URLs to skipped", async () => {
    const p = provider({ '"Ceramic Mug" buy price': [{ url: "not-a-url", title: "?" }] });
    const out = await discoverCompetitors(input({ mode: "open" }), { provider: p, scrapeOne: okScrape });
    expect(out.candidates).toEqual([]);
    expect(out.skipped).toEqual([{ url: "not-a-url", reason: "bad_url" }]);
  });
});
