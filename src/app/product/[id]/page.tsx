"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { DemandCurve } from "@/components/DemandCurve";
import { PriceHistory } from "@/components/PriceHistory";
import { PromotionFlags } from "@/components/PromotionFlags";
import { RecommendationCard, VAN_WESTENDORP_ANCHOR_ID } from "@/components/RecommendationCard";
import type { MLRecView } from "@/components/RecommendationCard";
import { SalesHistoryUpload } from "@/components/SalesHistoryUpload";
import { PriceSurveyCard } from "@/components/PriceSurveyCard";
import { CompetitorPricesCard } from "@/components/CompetitorPricesCard";
import { formatCents } from "@/lib/money";
import { AppShell } from "@/components/AppShell";
import { ProductThumbnail } from "@/components/ProductThumbnail";

interface Detail {
  id: string;
  title: string;
  currentPrice: number;
  cogs: number | null;
  imageUrl: string | null;
}

interface RecData {
  action: "raise" | "lower" | "hold";
  phrasing: string;
  rulesJson: string;
}

function parseRecView(rec: RecData): MLRecView | null {
  try {
    const rules = JSON.parse(rec.rulesJson) as {
      suggestedPriceCents: number;
      expectedProfitLiftPct: number;
      r2: number;
      dataPoints: number;
      confidenceScore?: number;
      currentUnitsEstimate?: number;
      projectedUnitsEstimate?: number;
      currentProfitCents?: number;
      projectedProfitCents?: number;
      profitLiftCents?: number;
      fallbackLevel?: "category" | "catalog" | "global";
      fallbackCategoryName?: string;
      fallbackSourceCount?: number;
    };
    return {
      action: rec.action,
      suggestedPriceCents: rules.suggestedPriceCents,
      reasoning: rec.phrasing,
      r2: rules.r2,
      dataPoints: rules.dataPoints,
      expectedProfitLiftPct: rules.expectedProfitLiftPct,
      confidenceScore: rules.confidenceScore ?? null,
      currentUnitsEstimate: rules.currentUnitsEstimate ?? null,
      projectedUnitsEstimate: rules.projectedUnitsEstimate ?? null,
      currentProfitCents: rules.currentProfitCents ?? null,
      projectedProfitCents: rules.projectedProfitCents ?? null,
      profitLiftCents: rules.profitLiftCents ?? null,
      fallbackLevel: rules.fallbackLevel ?? null,
      fallbackCategoryName: rules.fallbackCategoryName ?? null,
      fallbackSourceCount: rules.fallbackSourceCount ?? null,
    };
  } catch {
    return null;
  }
}

function MLActionButtons({
  productId,
  onComplete,
}: {
  productId: string;
  onComplete: () => void;
}) {
  const [fitting, setFitting] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fitModel() {
    setFitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/fit-model`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Fit model failed" }));
        throw new Error(body.error ?? "Fit model failed");
      }
      setFitting(false);
      onComplete();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Fit model failed";
      if (message.includes("Insufficient data")) {
        // No baseline model could be fit from this product's own sales data —
        // fall straight through to Get Recommendation, which can still succeed
        // via the category/catalog/global fallback cascade. Keep `fitting` true
        // until the chained call resolves so the Fit Model button stays disabled
        // for the whole window, closing the re-entrancy gap a premature
        // setFitting(false) would otherwise open.
        await getRecommendation();
        setFitting(false);
        return;
      }
      setFitting(false);
      setError(message);
    }
  }

  async function getRecommendation() {
    setRecommending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/recommend`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Get recommendation failed" }));
        throw new Error(body.error ?? "Get recommendation failed");
      }
      setRecommending(false);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Get recommendation failed");
      setRecommending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="btn btn-primary"
        disabled={fitting}
        onClick={fitModel}
      >
        {fitting ? "Fitting…" : "Fit Model"}
      </button>
      <button
        className="btn btn-primary"
        disabled={recommending}
        onClick={getRecommendation}
      >
        {recommending ? "Generating…" : "Get Recommendation"}
      </button>
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [rec, setRec] = useState<RecData | null>(null);
  const [failed, setFailed] = useState(false);

  function loadData() {
    let active = true;
    fetch(`/api/products/${id}`)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => data && active && setD(data))
      .catch(() => active && setFailed(true));

    fetch(`/api/products/${id}/recommendation`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && active && setRec(data))
      .catch(() => {});

    return () => {
      active = false;
    };
  }

  useEffect(loadData, [id]);

  const mlRec = d && rec ? parseRecView(rec) : null;

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-6 py-10">
        {failed ? (
          <div className="mt-8 rounded-xl border border-line bg-surface p-8 text-center">
            <p className="text-sm font-medium text-danger">
              This product couldn&apos;t be loaded.
            </p>
            <p className="mt-1 text-sm text-muted">
              It may have been removed. Head back to the dashboard.
            </p>
          </div>
        ) : !d ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="space-y-8">
            <header>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-4">
                <ProductThumbnail imageUrl={d.imageUrl} alt={d.title} size={56} />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-ink">{d.title}</h1>
                  <p className="mt-1 text-sm text-muted">
                    Current price{" "}
                    <span className="font-medium tabular text-ink">
                      {formatCents(d.currentPrice)}
                    </span>
                  </p>
                </div>
              </div>
            </header>

            <SalesHistoryUpload onSuccess={loadData} />

            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">Analyse Pricing</h2>
              <p className="mt-0.5 mb-4 text-xs text-muted">
                Fit the elasticity model on your sales data, then generate a recommendation.
              </p>
              <MLActionButtons productId={d.id} onComplete={loadData} />
            </div>

            <RecommendationCard rec={mlRec} currentPriceCents={d.currentPrice} />

            {/* id matches VAN_WESTENDORP_ANCHOR_ID in RecommendationCard.tsx, which links here */}
            <div id={VAN_WESTENDORP_ANCHOR_ID} className="scroll-mt-8">
              <PriceSurveyCard productId={d.id} />
            </div>

            <CompetitorPricesCard productId={d.id} />

            <DemandCurve
              productId={d.id}
              suggestedPriceCents={mlRec?.suggestedPriceCents ?? null}
            />

            <WhatIfSlider
              productId={d.id}
              currentPrice={d.currentPrice}
              cogs={d.cogs}
              suggestedPrice={mlRec?.suggestedPriceCents ?? null}
              expectedProfitLiftPct={mlRec?.expectedProfitLiftPct ?? null}
            />

            <PriceHistory productId={d.id} />

            <PromotionFlags productId={d.id} hasModel={mlRec !== null} />
          </div>
        )}
      </main>
    </AppShell>
  );
}
