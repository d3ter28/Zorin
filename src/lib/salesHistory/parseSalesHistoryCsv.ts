import { dollarsToCents } from "../money";

export interface ParsedSalesRow {
  line: number;
  sku: string;
  date: Date;
  unitsSold: number;
  priceCents: number;
}

export interface RowError {
  line: number;
  raw: string;
  reason: string;
}

export interface SalesParseResult {
  rows: ParsedSalesRow[];
  errors: RowError[];
}

const HEADER = "sku,date,units_sold,price";

export function parseSalesHistoryCsv(input: string): SalesParseResult {
  const rows: ParsedSalesRow[] = [];
  const errors: RowError[] = [];
  let sawFirstContentLine = false;

  input.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return;

    const fields = trimmed.split(",").map((f) => f.trim());

    if (!sawFirstContentLine) {
      sawFirstContentLine = true;
      if (fields.join(",").toLowerCase() === HEADER) return;
    }

    if (fields.length !== 4) {
      errors.push({ line, raw, reason: "malformed line: expected 4 columns" });
      return;
    }

    const [sku, dateStr, unitsStr, priceStr] = fields;

    if (!sku) {
      errors.push({ line, raw, reason: "missing sku" });
      return;
    }

    const dateMs = Date.parse(dateStr);
    if (isNaN(dateMs)) {
      errors.push({ line, raw, reason: "invalid date: expected YYYY-MM-DD" });
      return;
    }

    const unitsSold = Number(unitsStr);
    if (!Number.isInteger(unitsSold) || unitsSold <= 0) {
      errors.push({ line, raw, reason: "invalid units_sold: must be positive integer" });
      return;
    }

    const priceCents = dollarsToCents(priceStr);
    if (priceCents === null || priceCents <= 0) {
      errors.push({ line, raw, reason: "invalid price: must be positive dollar amount" });
      return;
    }

    rows.push({ line, sku, date: new Date(dateMs), unitsSold, priceCents });
  });

  return { rows, errors };
}
