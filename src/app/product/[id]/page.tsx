"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { ManageCompetitors } from "@/components/ManageCompetitors";
import { RecommendationCard, type RecView } from "@/components/RecommendationCard";
import { formatCents } from "@/lib/money";

interface Detail {
  id: string;
  title: string;
  currentPrice: number;
  cogs: number | null;
  competitors: {
    name: string;
    price: number;
    url: string;
    lastObservedAt: string;
    isStale: boolean;
  }[];
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [rec, setRec] = useState<RecView | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
    fetch(`/api/products/${id}/recommendation`, { method: "POST" })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((j) => {
        if (active && j) {
          setRec({
            action: j.decision.action,
            suggestedPrice: j.decision.suggestedPrice,
            phrasing: j.phrasing,
            competitorCount: j.decision.signals.competitorCount,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  if (failed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link className="text-sm text-muted hover:text-accent" href="/">
          ← Back to dashboard
        </Link>
        <div className="mt-8 rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-sm font-medium text-danger">
            This product couldn&apos;t be loaded.
          </p>
          <p className="mt-1 text-sm text-muted">
            It may have been removed. Head back to the dashboard.
          </p>
        </div>
      </main>
    );
  }

  if (!d) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted">Loading…</main>
    );
  }

  // Exclude stale competitors from the what-if median so it matches the
  // dashboard and the recommendation, which also drop stale prices.
  const freshCompetitors = d.competitors.filter((c) => !c.isStale);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <Link className="text-sm text-muted hover:text-accent" href="/">
        ← Back to dashboard
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{d.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Current price{" "}
          <span className="font-medium tabular text-ink">
            {formatCents(d.currentPrice)}
          </span>
        </p>
      </header>

      <RecommendationCard rec={rec} />

      {rec ? (
        <WhatIfSlider
          productId={d.id}
          currentPrice={d.currentPrice}
          cogs={d.cogs}
          compMedian={
            freshCompetitors.length === 0
              ? null
              : [...freshCompetitors].map((c) => c.price).sort((a, b) => a - b)[
                  Math.floor(freshCompetitors.length / 2)
                ]
          }
          suggestedPrice={rec.suggestedPrice}
        />
      ) : (
        <div className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
          Loading price tools…
        </div>
      )}

      <ManageCompetitors productId={d.id} competitors={d.competitors} />
    </main>
  );
}
