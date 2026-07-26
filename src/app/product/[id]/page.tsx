"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { DemandCurve } from "@/components/DemandCurve";
import { PriceHistory } from "@/components/PriceHistory";
import { PromotionFlags } from "@/components/PromotionFlags";
import { RecommendationCard } from "@/components/RecommendationCard";
import type { MLRecView } from "@/components/RecommendationCard";
import { SalesHistoryUpload } from "@/components/SalesHistoryUpload";
import { formatCents } from "@/lib/money";
import { AppShell } from "@/components/AppShell";

interface Detail {
  id: string;
  title: string;
  currentPrice: number;
  cogs: number | null;
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
    };
    return {
      action: rec.action,
      suggestedPriceCents: rules.suggestedPriceCents,
      reasoning: rec.phrasing,
      r2: rules.r2,
      dataPoints: rules.dataPoints,
      expectedProfitLiftPct: rules.expectedProfitLiftPct,
      confidenceScore: rules.confidenceScore ?? null,
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
      setError(e instanceof Error ? e.message : "Fit model failed");
      setFitting(false);
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
              <Link
                href="/dashboard"
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{d.title}</h1>
              <p className="mt-1 text-sm text-muted">
                Current price{" "}
                <span className="font-medium tabular text-ink">
                  {formatCents(d.currentPrice)}
                </span>
              </p>
            </header>

            <SalesHistoryUpload onSuccess={loadData} />

            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">Analyse Pricing</h2>
              <p className="mt-0.5 mb-4 text-xs text-muted">
                Fit the elasticity model on your sales data, then generate a recommendation.
              </p>
              <MLActionButtons productId={d.id} onComplete={loadData} />
            </div>

            <RecommendationCard rec={mlRec} />

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
