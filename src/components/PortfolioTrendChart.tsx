"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface TrendPoint {
  month: string;
  avgPriceCents: number;
  totalUnits: number;
  dataPoints: number;
}

const W = 560;
const H = 220;
const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function monthLabel(m: string) {
  const [year, month] = m.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleString("default", { month: "short" });
}

export function PortfolioTrendChart() {
  const [data, setData] = useState<TrendPoint[] | null>(null);

  useEffect(() => {
    fetch("/api/products/portfolio/trend")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: TrendPoint[]) => setData(d))
      .catch(() => setData([]));
  }, []);

  if (data === null) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="text-sm text-muted">Upload sales history to see price trends.</p>
      </div>
    );
  }

  const prices = data.map((d) => d.avgPriceCents);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const priceRange = maxP - minP || 1;

  function xOf(i: number) {
    return PAD.left + (i / (data!.length - 1)) * INNER_W;
  }
  function yOf(priceCents: number) {
    return PAD.top + INNER_H - ((priceCents - minP) / priceRange) * INNER_H;
  }

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d.avgPriceCents).toFixed(1)}`)
    .join(" ");

  const fillPath =
    linePath +
    ` L${xOf(data.length - 1).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)}` +
    ` L${xOf(0).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} Z`;

  const yTicks = [minP, minP + priceRange / 2, maxP];
  const step = Math.ceil(data.length / 6);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">Avg Price Trend</h2>
        <p className="text-xs text-muted mt-0.5">Monthly average across all products</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "var(--font-mono, monospace)" }}>
        {yTicks.map((p) => (
          <g key={p}>
            <line
              x1={PAD.left} x2={PAD.left + INNER_W}
              y1={yOf(p)} y2={yOf(p)}
              stroke="var(--color-line)" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={yOf(p)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="var(--color-faint)"
            >
              {formatCents(p)}
            </text>
          </g>
        ))}
        <path d={fillPath} fill="var(--color-accent)" opacity="0.08" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.month} cx={xOf(i)} cy={yOf(d.avgPriceCents)} r="3" fill="var(--color-accent)" />
        ))}
        {data.map((d, i) => {
          if (i % step !== 0 && i !== data!.length - 1) return null;
          return (
            <text key={d.month} x={xOf(i)} y={PAD.top + INNER_H + 18}
              textAnchor="middle" fontSize="9" fill="var(--color-faint)">
              {monthLabel(d.month)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
