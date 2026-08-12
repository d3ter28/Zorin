export interface CogsChangeRow {
  toCents: number;
  changedAt: Date;
}

export interface SalesRow {
  productId: string;
  date: Date;
  unitsSold: number;
  priceCents: number;
}

export interface MonthlyPnLPoint {
  month: string; // "YYYY-MM"
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  estimated: boolean;
}

export interface ProductProfit {
  productId: string;
  units: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  marginPct: number | null;
  estimated: boolean;
}

export interface WindowProfit {
  grossProfitCents: number;
  revenueCents: number;
  units: number;
  estimated: boolean;
  hasSales: boolean;
}

export function cogsInEffectOn(
  changes: CogsChangeRow[],
  currentCogs: number | null,
  date: Date,
): { cogsCents: number | null; estimated: boolean } {
  const sorted = [...changes].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  let inEffect: number | null = null;
  for (const c of sorted) {
    if (c.changedAt.getTime() <= date.getTime()) inEffect = c.toCents;
    else break;
  }
  if (inEffect === null) return { cogsCents: currentCogs, estimated: true };
  return { cogsCents: inEffect, estimated: false };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthlyPnL(
  salesRows: SalesRow[],
  cogsChangesByProduct: Map<string, CogsChangeRow[]>,
  currentCogsByProduct: Map<string, number | null>,
  months: number,
  now: Date,
): MonthlyPnLPoint[] {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const buckets = new Map<string, MonthlyPnLPoint>();

  for (const row of salesRows) {
    if (row.date.getTime() < cutoff.getTime()) continue;
    const changes = cogsChangesByProduct.get(row.productId) ?? [];
    const current = currentCogsByProduct.get(row.productId) ?? null;
    const { cogsCents, estimated } = cogsInEffectOn(changes, current, row.date);
    if (cogsCents === null) continue;

    const key = monthKey(row.date);
    const b = buckets.get(key) ?? { month: key, revenueCents: 0, cogsCents: 0, grossProfitCents: 0, estimated: false };
    const revenue = row.unitsSold * row.priceCents;
    const cost = row.unitsSold * cogsCents;
    b.revenueCents += revenue;
    b.cogsCents += cost;
    b.grossProfitCents += revenue - cost;
    b.estimated = b.estimated || estimated;
    buckets.set(key, b);
  }

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function productProfit(
  salesRows: SalesRow[],
  cogsChangesByProduct: Map<string, CogsChangeRow[]>,
  currentCogsByProduct: Map<string, number | null>,
  windowStart: Date,
  windowEnd: Date,
): ProductProfit[] {
  const acc = new Map<string, ProductProfit>();

  for (const row of salesRows) {
    if (row.date.getTime() < windowStart.getTime() || row.date.getTime() >= windowEnd.getTime()) continue;
    const changes = cogsChangesByProduct.get(row.productId) ?? [];
    const current = currentCogsByProduct.get(row.productId) ?? null;
    const { cogsCents, estimated } = cogsInEffectOn(changes, current, row.date);
    if (cogsCents === null) continue;

    const p = acc.get(row.productId) ?? {
      productId: row.productId, units: 0, revenueCents: 0, cogsCents: 0, grossProfitCents: 0, marginPct: null, estimated: false,
    };
    const revenue = row.unitsSold * row.priceCents;
    const cost = row.unitsSold * cogsCents;
    p.units += row.unitsSold;
    p.revenueCents += revenue;
    p.cogsCents += cost;
    p.grossProfitCents += revenue - cost;
    p.estimated = p.estimated || estimated;
    acc.set(row.productId, p);
  }

  for (const p of acc.values()) {
    p.marginPct = p.revenueCents > 0 ? p.grossProfitCents / p.revenueCents : null;
  }
  return Array.from(acc.values());
}

export function windowProfitForProducts(
  salesRows: SalesRow[],
  cogsChangesByProduct: Map<string, CogsChangeRow[]>,
  currentCogsByProduct: Map<string, number | null>,
  productIds: string[],
  start: Date,
  end: Date,
): WindowProfit {
  const idSet = new Set(productIds);
  let grossProfitCents = 0;
  let revenueCents = 0;
  let units = 0;
  let estimated = false;
  let hasSales = false;

  for (const row of salesRows) {
    if (!idSet.has(row.productId)) continue;
    if (row.date.getTime() < start.getTime() || row.date.getTime() >= end.getTime()) continue;
    const changes = cogsChangesByProduct.get(row.productId) ?? [];
    const current = currentCogsByProduct.get(row.productId) ?? null;
    const { cogsCents, estimated: est } = cogsInEffectOn(changes, current, row.date);
    if (cogsCents === null) continue;
    hasSales = true;
    const revenue = row.unitsSold * row.priceCents;
    revenueCents += revenue;
    units += row.unitsSold;
    grossProfitCents += revenue - row.unitsSold * cogsCents;
    estimated = estimated || est;
  }

  return { grossProfitCents, revenueCents, units, estimated, hasSales };
}
