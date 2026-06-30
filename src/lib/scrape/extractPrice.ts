import * as cheerio from "cheerio";

/**
 * Parse a price string that may carry currency symbols, thousands separators,
 * and either US (1,299.00) or EU (1.299,00) decimal conventions, into integer
 * cents. Returns null for zero, negative, or unparseable input.
 */
export function normalizePrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (s === "") return null;
  // keep only digits, separators, and a leading minus
  s = s.replace(/[^0-9.,-]/g, "");
  if (s === "" || s === "-") return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalSep: "." | "," | null = null;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastComma !== -1) {
    // a lone comma: treat as decimal only if it looks like one (e.g. "12,99")
    decimalSep = /,\d{1,2}$/.test(s) ? "," : null;
  } else if (lastDot !== -1) {
    decimalSep = ".";
  }

  let normalized: string;
  if (decimalSep === ",") {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (decimalSep === ".") {
    normalized = s.replace(/,/g, "");
  } else {
    normalized = s.replace(/[.,]/g, "");
  }

  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Recursively search a parsed JSON-LD value for the first usable Offer price. */
function findOfferPrice(node: unknown): number | null {
  if (node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findOfferPrice(item);
      if (found !== null) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  // direct offer-ish shape
  if ("price" in obj) {
    const cents = normalizePrice(obj.price as string | number);
    if (cents !== null) return cents;
  }
  for (const key of ["offers", "@graph", "itemListElement"]) {
    if (key in obj) {
      const found = findOfferPrice(obj[key]);
      if (found !== null) return found;
    }
  }
  return null;
}

function fromJsonLd($: cheerio.CheerioAPI): number | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const text = $(scripts[i]).text().trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const cents = findOfferPrice(parsed);
      if (cents !== null) return cents;
    } catch {
      // malformed JSON-LD — ignore and try the next block
    }
  }
  return null;
}

function fromMeta($: cheerio.CheerioAPI): number | null {
  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[itemprop="price"]',
  ];
  for (const sel of selectors) {
    const content = $(sel).attr("content");
    const cents = normalizePrice(content);
    if (cents !== null) return cents;
  }
  return null;
}

function fromSelector($: cheerio.CheerioAPI): number | null {
  const selectors = ["[itemprop=price]", ".price", "[data-price]"];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length === 0) continue;
    const cents = normalizePrice(el.attr("content") ?? el.text());
    if (cents !== null) return cents;
  }
  return null;
}

/**
 * Extract a product price (integer cents) from page HTML, trying the most
 * reliable sources first: JSON-LD structured data, then Open Graph/meta tags,
 * then a CSS-selector fallback. Returns null when no plausible price is found.
 */
export function extractPrice(html: string): number | null {
  const $ = cheerio.load(html);
  return fromJsonLd($) ?? fromMeta($) ?? fromSelector($);
}
