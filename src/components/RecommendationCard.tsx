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
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">Recommendation</p>
        <p className="mt-2 text-sm font-medium text-muted">No recommendation yet</p>
        <p className="mt-1 text-xs text-faint leading-relaxed">
          Upload your sales history and click <span className="font-medium text-ink">Fit Model</span>, then{" "}
          <span className="font-medium text-ink">Get Recommendation</span> to see a data-backed price suggestion.
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            Upload sales data
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            Fit model
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            Get recommendation
          </span>
        </div>
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
