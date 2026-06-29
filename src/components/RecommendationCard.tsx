"use client";

export interface RecView {
  action: string;
  suggestedPrice: number;
  phrasing: string;
  competitorCount: number;
}

/**
 * Presentational recommendation summary. The price control and Apply action
 * live in WhatIfSlider; this card just explains what the engine suggests.
 */
export function RecommendationCard({ rec }: { rec: RecView | null }) {
  if (!rec) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-panel" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-panel" />
      </div>
    );
  }

  const tone =
    rec.action === "raise"
      ? "text-positive"
      : rec.action === "lower"
        ? "text-warning"
        : "text-muted";
  const freshness =
    rec.competitorCount > 0
      ? `Based on ${rec.competitorCount} competitor${
          rec.competitorCount === 1 ? "" : "s"
        }`
      : "No competitor data";

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
          {rec.action}
        </span>
        <span className="text-faint">·</span>
        <span className="text-xs text-faint">{freshness}</span>
      </div>
      <p className="mt-2 text-ink">{rec.phrasing}</p>
    </div>
  );
}
