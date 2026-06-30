import { describe, expect, it } from "vitest";
import { extractPrice, normalizePrice } from "./extractPrice";

describe("normalizePrice", () => {
  it("parses plain decimals to cents", () => {
    expect(normalizePrice("12.99")).toBe(1299);
  });
  it("strips currency symbols and spaces", () => {
    expect(normalizePrice(" $12.99 ")).toBe(1299);
  });
  it("handles US thousands separators", () => {
    expect(normalizePrice("$1,299.00")).toBe(129900);
  });
  it("handles EU format (comma decimal, dot thousands)", () => {
    expect(normalizePrice("1.299,00")).toBe(129900);
  });
  it("rejects zero and negatives", () => {
    expect(normalizePrice("$0")).toBeNull();
    expect(normalizePrice("-5")).toBeNull();
  });
  it("rejects garbage", () => {
    expect(normalizePrice("call for price")).toBeNull();
  });
});

describe("extractPrice", () => {
  it("reads price from JSON-LD Product/Offer", () => {
    const html = `<html><head><script type="application/ld+json">
      {"@type":"Product","name":"X","offers":{"@type":"Offer","price":"24.50","priceCurrency":"USD"}}
    </script></head><body></body></html>`;
    expect(extractPrice(html)).toBe(2450);
  });
  it("reads price when JSON-LD offers is an array", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Product","offers":[{"@type":"Offer","price":"30.00"}]}
    </script>`;
    expect(extractPrice(html)).toBe(3000);
  });
  it("reads price from a JSON-LD @graph node", () => {
    const html = `<script type="application/ld+json">
      {"@graph":[{"@type":"WebSite"},{"@type":"Product","offers":{"price":"9.99"}}]}
    </script>`;
    expect(extractPrice(html)).toBe(999);
  });
  it("falls back to Open Graph meta when no JSON-LD", () => {
    const html = `<html><head>
      <meta property="product:price:amount" content="15.00">
    </head></html>`;
    expect(extractPrice(html)).toBe(1500);
  });
  it("falls back to a CSS selector when no structured data", () => {
    const html = `<html><body><span itemprop="price">$42.00</span></body></html>`;
    expect(extractPrice(html)).toBe(4200);
  });
  it("returns null when no price is present", () => {
    const html = `<html><body><p>no price here</p></body></html>`;
    expect(extractPrice(html)).toBeNull();
  });
  it("ignores malformed JSON-LD and falls through", () => {
    const html = `<script type="application/ld+json">{ not json </script>
      <meta property="og:price:amount" content="7.50">`;
    expect(extractPrice(html)).toBe(750);
  });
});
