export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Parse a dollar amount (string or number) to integer cents. Null if invalid or negative. */
export function dollarsToCents(value: string | number): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
