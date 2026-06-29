"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { RecommendationCard, type RecView } from "@/components/RecommendationCard";
import { formatCents } from "@/lib/money";

interface Detail {
  id: string;
  title: string;
  currentPrice: number;
  cogs: number | null;
  competitors: { name: string; price: number; observedAt: string }[];
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [rec, setRec] = useState<RecView | null>(null);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then(setD);
    fetch(`/api/products/${id}/recommendation`, { method: "POST" })
      .then((r) => r.json())
      .then((j) =>
        setRec({
          action: j.decision.action,
          suggestedPrice: j.decision.suggestedPrice,
          phrasing: j.phrasing,
          competitorCount: j.decision.signals.competitorCount,
        }),
      );
  }, [id]);

  if (!d) return <main className="p-8">Loading…</main>;

  const median =
    d.competitors.length === 0
      ? null
      : [...d.competitors].map((c) => c.price).sort((a, b) => a - b)[
          Math.floor(d.competitors.length / 2)
        ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Link className="text-sm underline" href="/">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">{d.title}</h1>
      <div>Current price: {formatCents(d.currentPrice)}</div>

      <section>
        <h2 className="mb-2 font-medium">Competitors</h2>
        <ul className="space-y-1 text-sm">
          {d.competitors.map((c, i) => (
            <li key={i} className="flex justify-between border-b py-1">
              <span>{c.name}</span>
              <span>{formatCents(c.price)}</span>
            </li>
          ))}
        </ul>
      </section>

      <RecommendationCard rec={rec} />

      {rec ? (
        <WhatIfSlider
          productId={d.id}
          currentPrice={d.currentPrice}
          cogs={d.cogs}
          compMedian={median}
          suggestedPrice={rec.suggestedPrice}
        />
      ) : (
        <div className="rounded border p-4 text-gray-500">Loading price tools…</div>
      )}
    </main>
  );
}
