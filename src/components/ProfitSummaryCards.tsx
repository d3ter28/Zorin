"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { formatCents } from "@/lib/money";

interface PnLPoint {
  month: string;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  estimated: boolean;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs">{sub}</p>}
    </div>
  );
}

export function ProfitSummaryCards() {
  const [data, setData] = useState<PnLPoint[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/profit/trend")
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then((d: PnLPoint[]) => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 text-sm text-danger">
        Could not load profit data. Try refreshing the page.
      </div>
    );
  }

  if (data === null) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-20 animate-pulse rounded-xl bg-panel" />
    ))}</div>;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-ink">No profit data yet</p>
        <p className="mt-1 text-sm text-muted">Add COGS to your products and sync sales to see profit.</p>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const momPct = prev && prev.grossProfitCents !== 0
    ? ((latest.grossProfitCents - prev.grossProfitCents) / Math.abs(prev.grossProfitCents)) * 100
    : null;
  const margin = latest.revenueCents > 0 ? (latest.grossProfitCents / latest.revenueCents) * 100 : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card
        label="Gross profit (latest mo)"
        value={formatCents(latest.grossProfitCents)}
        sub={momPct !== null ? (
          <span className={momPct >= 0 ? "text-positive" : "text-danger"}>
            {momPct >= 0 ? "▲" : "▼"} {Math.abs(momPct).toFixed(1)}% vs last mo
          </span>
        ) : undefined}
      />
      <Card label="Revenue" value={formatCents(latest.revenueCents)} />
      <Card label="Avg margin" value={margin !== null ? `${margin.toFixed(0)}%` : "—"} />
      <Card label="COGS" value={formatCents(latest.cogsCents)} />
    </div>
  );
}
