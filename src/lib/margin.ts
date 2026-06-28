export function marginPct(price: number, cogs: number | null): number | null {
  if (cogs === null || price <= 0) return null;
  return (price - cogs) / price;
}
