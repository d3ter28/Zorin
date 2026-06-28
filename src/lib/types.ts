export type Action = "raise" | "lower" | "hold";

export interface Signals {
  marginPct: number | null;
  compMedian: number | null;
  compMin: number | null;
  compMax: number | null;
  pctVsMedian: number | null;
  marginFloorPrice: number | null;
  competitorCount: number;
  oldestObservedAt: string | null;
}

export interface Decision {
  action: Action;
  deltaPct: number;       // signed
  suggestedPrice: number; // cents
  reasons: string[];
  signals: Signals;
}

export interface CompetitorObservation {
  price: number;        // cents
  observedAt: string;   // ISO
}

export interface ProductInput {
  currentPrice: number; // cents
  cogs: number | null;  // cents
}
