import { dollarsToCents } from "../money";

export interface ParsedRow {
  line: number;
  sku: string;
  competitorName: string;
  priceCents: number;
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

const HEADER = "sku,competitor_name,price";

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
      if (fields.join(",").toLowerCase() === HEADER) return;
    }

    if (fields.length !== 3) {
      errors.push({ line, raw, reason: "malformed line: expected 3 columns" });
      return;
    }
    const [sku, competitorName, priceStr] = fields;
    if (sku === "" || competitorName === "") {
      errors.push({ line, raw, reason: "missing sku or competitor_name" });
      return;
    }
    const priceCents = dollarsToCents(priceStr);
    if (priceCents === null) {
      errors.push({ line, raw, reason: "invalid price" });
      return;
    }
    rows.push({ line, sku, competitorName, priceCents });
  });

  return { rows, errors };
}
