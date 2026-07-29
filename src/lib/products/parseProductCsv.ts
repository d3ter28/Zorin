import { dollarsToCents } from "../money";

export interface ParsedProductRow {
  line: number;
  sku: string;
  title: string;
  currentPriceCents: number;
  category: string;
  cogsCents: number | null;
  estUnits: number | null;
  imageUrl: string | null;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface ProductParseResult {
  rows: ParsedProductRow[];
  errors: RowError[];
}

const HEADER = "sku,title,current_price,category,cogs,est_units";
const HEADER_WITH_IMAGE = "sku,title,current_price,category,cogs,est_units,image_url";

/** Parse an optional integer-count field. Returns undefined when invalid. */
function parseCount(value: string): number | null | undefined {
  if (value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

/**
 * Parse the optional 7th image_url field. Returns null when absent/empty
 * (legacy 6-column rows destructure this as undefined), undefined when
 * present but not a valid http(s) URL.
 */
function parseImageUrl(value: string | undefined): string | null | undefined {
  if (value === undefined || value === "") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    return undefined;
  }
}

/** Parse a product-catalog CSV. Never throws; problems become RowErrors. */
export function parseProductCsv(input: string): ProductParseResult {
  const rows: ParsedProductRow[] = [];
  const errors: RowError[] = [];
  let sawFirstContentLine = false;

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return; // skip blank lines

    const fields = trimmed.split(",").map((f) => f.trim());

    // Skip a header row if it is the first non-blank line.
    if (!sawFirstContentLine) {
      sawFirstContentLine = true;
      const joined = fields.join(",").toLowerCase();
      if (joined === HEADER || joined === HEADER_WITH_IMAGE) return;
    }

    if (fields.length !== 6 && fields.length !== 7) {
      errors.push({ line, raw, reason: "malformed line: expected 6 or 7 columns" });
      return;
    }
    const [sku, title, priceStr, category, cogsStr, unitsStr, imageUrlStr] = fields;
    if (sku === "") {
      errors.push({ line, raw, reason: "missing sku" });
      return;
    }
    if (title === "") {
      errors.push({ line, raw, reason: "missing title" });
      return;
    }
    if (category === "") {
      errors.push({ line, raw, reason: "missing category" });
      return;
    }
    const currentPriceCents = dollarsToCents(priceStr);
    if (currentPriceCents === null || currentPriceCents <= 0) {
      errors.push({ line, raw, reason: "invalid current_price" });
      return;
    }
    const cogsCents = cogsStr === "" ? null : dollarsToCents(cogsStr);
    if (cogsStr !== "" && cogsCents === null) {
      errors.push({ line, raw, reason: "invalid cogs" });
      return;
    }
    const estUnits = parseCount(unitsStr);
    if (estUnits === undefined) {
      errors.push({ line, raw, reason: "invalid est_units" });
      return;
    }
    const imageUrl = parseImageUrl(imageUrlStr);
    if (imageUrl === undefined) {
      errors.push({ line, raw, reason: "invalid image_url" });
      return;
    }

    rows.push({
      line,
      sku,
      title,
      currentPriceCents,
      category,
      cogsCents: cogsCents ?? null,
      estUnits,
      imageUrl,
    });
  });

  return { rows, errors };
}
