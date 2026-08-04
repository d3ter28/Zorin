export interface CompetitorPriceRow {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: Date;
}

export function serializeCompetitorPrice(row: CompetitorPriceRow) {
  return {
    id: row.id,
    competitorName: row.competitorName,
    priceCents: row.priceCents,
    url: row.url,
    capturedAt: row.capturedAt.toISOString(),
  };
}

/** Absolute http(s) URL only — competitor product pages live on arbitrary external domains. */
export function validateCompetitorUrl(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}
