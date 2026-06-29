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
  if (!rec) return <div className="rounded border p-4">Analyzing…</div>;

  const freshness =
    rec.competitorCount > 0
      ? `Based on ${rec.competitorCount} competitor${
          rec.competitorCount === 1 ? "" : "s"
        }`
      : "No competitor data";

  return (
    <div className="rounded border p-4">
      <div className="mb-1 text-xs uppercase text-gray-400">
        Recommendation · {rec.action}
      </div>
      <p className="mb-2">{rec.phrasing}</p>
      <div className="text-xs text-gray-500">{freshness}</div>
    </div>
  );
}
