import { dollarsToCents } from "../money";

export interface ParsedProductRow {
  line: number;
  sku: string;
  title: string;
  currentPriceCents: number;
  category: string;
  cogsCents: number | null;
  estUnits: number | null;
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

/** Parse an optional integer-count field. Returns undefined when invalid. */
function parseCount(value: string): number | null | undefined {
  if (value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
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
      if (fields.join(",").toLowerCase() === HEADER) return;
    }

    if (fields.length !== 6) {
      errors.push({ line, raw, reason: "malformed line: expected 6 columns" });
      return;
    }
    const [sku, title, priceStr, category, cogsStr, unitsStr] = fields;
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

    rows.push({
      line,
      sku,
      title,
      currentPriceCents,
      category,
      cogsCents: cogsCents ?? null,
      estUnits,
    });
  });

  return { rows, errors };
}
