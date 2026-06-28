export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
