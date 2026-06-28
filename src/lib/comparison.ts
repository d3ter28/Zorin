import type { CompetitorObservation } from "./types";

export interface ComparisonResult {
  compMedian: number | null;
  compMin: number | null;
  compMax: number | null;
  pctVsMedian: number | null;
  competitorCount: number;
  oldestObservedAt: string | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function compare(
  price: number,
  competitors: CompetitorObservation[],
): ComparisonResult {
  if (competitors.length === 0) {
    return {
      compMedian: null,
      compMin: null,
      compMax: null,
      pctVsMedian: null,
      competitorCount: 0,
      oldestObservedAt: null,
    };
  }
  const prices = competitors.map((c) => c.price);
  const med = median(prices);
  const oldest = competitors
    .map((c) => c.observedAt)
    .sort()[0];
  return {
    compMedian: med,
    compMin: Math.min(...prices),
    compMax: Math.max(...prices),
    pctVsMedian: med === 0 ? null : (price - med) / med,
    competitorCount: competitors.length,
    oldestObservedAt: oldest,
  };
}
