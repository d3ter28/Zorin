"use client";

import { ModelHealthBadge } from "./ModelHealthBadge";
import { formatCents } from "@/lib/money";

/**
 * Anchor id for the Van Westendorp survey section (PriceSurveyCard) on the
 * product detail page. Shared with src/app/product/[id]/page.tsx so the
 * suggestion link below and the section it targets can't silently drift
 * apart into two independently-maintained string literals.
 */
export const VAN_WESTENDORP_ANCHOR_ID = "van-westendorp-survey";

export interface MLRecView {
  action: "raise" | "lower" | "hold";
  suggestedPriceCents: number;
  reasoning: string;
  r2: number;
  dataPoints: number;
  expectedProfitLiftPct: number;
  confidenceScore?: number | null;
  currentUnitsEstimate?: number | null;
  projectedUnitsEstimate?: number | null;
  currentProfitCents?: number | null;
  projectedProfitCents?: number | null;
  profitLiftCents?: number | null;
  fallbackLevel?: "category" | "catalog" | "global" | null;
  fallbackCategoryName?: string | null;
  fallbackSourceCount?: number | null;
}

/**
 * When a recommendation was produced from the category/catalog/global
 * fallback cascade (no per-SKU model was possible), replaces the raw
 * backend `reasoning` string with level-specific copy that makes clear
 * this is a borrowed estimate, not a fit on this SKU's own sales history.
 * Caller is expected to only invoke this once `rec.fallbackLevel` is known
 * to be set — it renders the plain `rec.reasoning` line otherwise.
 */
function FallbackReasoningLine({ rec }: { rec: MLRecView }) {
  let text: string;
  if (rec.fallbackLevel === "category") {
    text = `Estimated from your ${rec.fallbackCategoryName ?? "product"} category (${rec.fallbackSourceCount ?? 0} similar products)`;
  } else if (rec.fallbackLevel === "catalog") {
    text = `Estimated from your whole catalog (${rec.fallbackSourceCount ?? 0} products)`;
  } else if (rec.fallbackLevel === "global") {
    text = "Estimated from typical retail elasticity (no comparable products yet)";
  } else {
    text = rec.reasoning;
  }

  return <p className="mt-2 text-ink">{text}</p>;
}

/**
 * Secondary suggestions shown only for fallback-sourced recommendations,
 * pointing the merchant toward ways to get a real reading instead of the
 * borrowed estimate: a Van Westendorp survey (linking to the existing
 * PriceSurveyCard section further down this same product page) or a
 * straightforward price test.
 */
function FallbackSuggestions({ rec }: { rec: MLRecView }) {
  if (rec.fallbackLevel == null) return null;

  return (
    <div className="mt-3 space-y-1 text-xs text-muted">
      <p>
        Or ask customers directly →{" "}
        <a href={`#${VAN_WESTENDORP_ANCHOR_ID}`} className="text-accent underline underline-offset-2 hover:opacity-80">
          Create a Van Westendorp survey
        </a>
      </p>
      <p>Or run a 2-week price test to get a real reading</p>
    </div>
  );
}

function WhyThisPrice({ rec, currentPriceCents }: { rec: MLRecView; currentPriceCents: number }) {
  if (
    rec.currentUnitsEstimate == null ||
    rec.projectedUnitsEstimate == null ||
    rec.currentProfitCents == null ||
    rec.projectedProfitCents == null ||
    rec.profitLiftCents == null
  ) {
    return null;
  }

  const currentUnits = Math.round(rec.currentUnitsEstimate);
  const projectedUnits = Math.round(rec.projectedUnitsEstimate);
  const liftCents = rec.profitLiftCents;
  const liftIsGain = liftCents >= 0;

  const headline =
    rec.action === "hold"
      ? `At ${formatCents(currentPriceCents)}, you're projected to sell ~${currentUnits} units for ~${formatCents(rec.currentProfitCents)} gross profit — already close to the profit-maximizing price.`
      : `At ${formatCents(currentPriceCents)}, you're projected to sell ~${currentUnits} units for ~${formatCents(rec.currentProfitCents)} gross profit. At ${formatCents(rec.suggestedPriceCents)}, that shifts to ~${projectedUnits} units for ~${formatCents(rec.projectedProfitCents)} gross profit.`;

  return (
    <div className="mt-3 rounded-lg border border-line bg-panel p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Why this price?</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink">{headline}</p>
      {rec.action !== "hold" && (
        <p className={`mt-2 text-sm font-semibold ${liftIsGain ? "text-positive" : "text-warning"}`}>
          {liftIsGain ? "+" : ""}
          {formatCents(liftCents)} projected monthly gross profit {liftIsGain ? "gain" : "change"}
        </p>
      )}
    </div>
  );
}

/**
 * Presentational recommendation summary backed by ML elasticity model.
 * The price control and Apply action live in WhatIfSlider; this card
 * just explains what the engine suggests.
 */
export function RecommendationCard({
  rec,
  currentPriceCents,
}: {
  rec: MLRecView | null;
  currentPriceCents?: number;
}) {
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
      <FallbackReasoningLine rec={rec} />
      {currentPriceCents != null && <WhyThisPrice rec={rec} currentPriceCents={currentPriceCents} />}
      <div className="mt-3">
        <ModelHealthBadge
          r2={rec.r2}
          dataPoints={rec.dataPoints}
          confidenceScore={rec.confidenceScore ?? null}
          isFallback={rec.fallbackLevel != null}
        />
      </div>
      <FallbackSuggestions rec={rec} />
    </div>
  );
}
