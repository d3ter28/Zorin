import { dollarsToCents } from "../money";

export interface ParsedRow {
  line: number;
  sku: string;
  competitorName: string;
  priceCents: number;
  competitorUrl?: string;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

const HEADER_3 = "sku,competitor_name,price";
const HEADER_4 = "sku,competitor_name,price,competitor_url";

/** Parse competitor-price CSV text. Never throws; problems become RowErrors. */
export function parseCsv(input: string): ParseResult {
  const rows: ParsedRow[] = [];
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
      const header = fields.join(",").toLowerCase();
      if (header === HEADER_3 || header === HEADER_4) return;
    }

    if (fields.length !== 3 && fields.length !== 4) {
      errors.push({ line, raw, reason: "malformed line: expected 3 or 4 columns" });
      return;
    }
    const [sku, competitorName, priceStr, urlStr] = fields;
    if (sku === "" || competitorName === "") {
      errors.push({ line, raw, reason: "missing sku or competitor_name" });
      return;
    }
    const priceCents = dollarsToCents(priceStr);
    if (priceCents === null) {
      errors.push({ line, raw, reason: "invalid price" });
      return;
    }
    const row: ParsedRow = { line, sku, competitorName, priceCents };
    if (urlStr && urlStr !== "") row.competitorUrl = urlStr;
    rows.push(row);
  });

  return { rows, errors };
}
