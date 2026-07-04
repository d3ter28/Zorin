"use client";

export interface MLRecView {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  reasoning: string;
  r2: number;
  dataPoints: number;
  expectedProfitLiftPct: number;
}

/**
 * Presentational recommendation summary backed by ML elasticity model.
 * The price control and Apply action live in WhatIfSlider; this card
 * just explains what the engine suggests.
 */
export function RecommendationCard({ rec }: { rec: MLRecView | null }) {
  if (!rec) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-panel" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-panel" />
        <p className="mt-2 text-xs text-muted">Upload sales history to generate a recommendation.</p>
      </div>
    );
  }

  const tone =
    rec.action === "raise"
      ? "text-positive"
      : rec.action === "lower"
        ? "text-warning"
        : "text-muted";

  const liftLabel = rec.expectedProfitLiftPct >= 0
    ? `+${(rec.expectedProfitLiftPct * 100).toFixed(1)}% expected profit lift`
    : `${(rec.expectedProfitLiftPct * 100).toFixed(1)}% expected profit change`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
          {rec.action}
        </span>
        <span className="text-faint">·</span>
        <span className="text-xs text-faint">{liftLabel}</span>
      </div>
      <p className="mt-2 text-ink">{rec.reasoning}</p>
      <p className="mt-2 text-xs text-muted">
        Model quality: R²={rec.r2.toFixed(2)}, {rec.dataPoints} data points
      </p>
    </div>
  );
}
