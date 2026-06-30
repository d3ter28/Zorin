import { describe, expect, it, vi } from "vitest";
import { scrapeOne } from "./scrapeOne";
import type { FetchResult } from "./fetcher";

const ok = (html: string): FetchResult => ({ ok: true, status: 200, html });

const PRICE_HTML = `<meta property="product:price:amount" content="12.00">`;

describe("scrapeOne", () => {
  it("returns the extracted price on success", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res).toMatchObject({ ok: true, priceCents: 1200 });
  });

  it("reports http failure with status", async () => {
    const fetchPage = vi.fn(async () => ({ ok: false, status: 404, html: "" }));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res).toMatchObject({ ok: false, reason: "http_404" });
  });

  it("reports no_price_found when extraction is empty", async () => {
    const fetchPage = vi.fn(async () => ok("<p>no price</p>"));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res).toMatchObject({ ok: false, reason: "no_price_found" });
  });

  it("rejects an implausible price far from the last known price", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML)); // 1200 cents
    const res = await scrapeOne("https://x/p", 100_000, { fetchPage }); // last $1000
    expect(res).toMatchObject({ ok: false, reason: "implausible" });
  });

  it("accepts a plausible change within the band", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML)); // 1200 cents
    const res = await scrapeOne("https://x/p", 1500, { fetchPage }); // last $15
    expect(res).toMatchObject({ ok: true, priceCents: 1200 });
  });

  it("skips the band check on the first scrape (no last price)", async () => {
    const fetchPage = vi.fn(async () => ok(PRICE_HTML));
    const res = await scrapeOne("https://x/p", null, { fetchPage });
    expect(res.ok).toBe(true);
  });
});
