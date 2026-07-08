"use client";

import { ModelHealthBadge } from "./ModelHealthBadge";

export interface MLRecView {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  reasoning: string;
  r2: number;
  dataPoints: number;
  expectedProfitLiftPct: number;
  confidenceScore?: number | null;
}

/**
 * Presentational recommendation summary backed by ML elasticity model.
 * The price control and Apply action live in WhatIfSlider; this card
 * just explains what the engine suggests.
 */
export function RecommendationCard({ rec }: { rec: MLRecView | null }) {
  if (!rec) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-24 rounded bg-panel" />
          <div className="h-3 w-48 rounded bg-panel" />
        </div>
        <p className="mt-3 text-sm text-muted">
          Upload sales history to generate a recommendation.
        </p>
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
      <div className="mt-3">
        <ModelHealthBadge r2={rec.r2} dataPoints={rec.dataPoints} confidenceScore={rec.confidenceScore ?? null} />
      </div>
    </div>
  );
}
