"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface PnLPoint {
  month: string;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  estimated: boolean;
}

const W = 560;
const H = 240;
const PAD = { top: 20, right: 20, bottom: 36, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

const SERIES: { key: keyof Pick<PnLPoint, "revenueCents" | "cogsCents" | "grossProfitCents">; label: string; color: string }[] = [
  { key: "revenueCents", label: "Revenue", color: "var(--color-accent)" },
  { key: "cogsCents", label: "COGS", color: "var(--color-warning)" },
  { key: "grossProfitCents", label: "Gross profit", color: "var(--color-positive)" },
];

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  return new Date(Number(y), Number(mm) - 1).toLocaleString("default", { month: "short" });
}

export function ProfitTrendChart() {
  const [data, setData] = useState<PnLPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profit/trend")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: PnLPoint[]) => { if (active) setData(d); })
      .catch(() => { if (active) setData([]); });
    return () => { active = false; };
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
      <div className="rounded-xl border border-line bg-surface p-5" style={{ minHeight: 280 }}>
        <h2 className="text-sm font-semibold text-ink">P&amp;L trend</h2>
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-muted">Add COGS and sync sales to see your profit trend.</p>
        </div>
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.revenueCents, d.cogsCents, d.grossProfitCents]);
  const minV = Math.min(0, ...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;
  const anyEstimated = data.some((d) => d.estimated);

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * INNER_W;
  const yOf = (v: number) => PAD.top + INNER_H - ((v - minV) / range) * INNER_H;

  const pathFor = (key: (typeof SERIES)[number]["key"]) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" ");

  const yTicks = [minV, minV + range / 2, maxV];
  const step = Math.ceil(data.length / 6);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-start justify-between">
        <h2 className="text-sm font-semibold text-ink">P&amp;L trend</h2>
        <div className="flex gap-3 text-xs">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-muted">
              <span style={{ display: "inline-block", width: 10, height: 2, background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "var(--font-mono, monospace)" }}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={PAD.left + INNER_W} y1={yOf(v)} y2={yOf(v)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--color-faint)">
              {formatCents(v)}
            </text>
          </g>
        ))}
        {minV < 0 && (
          <line
            x1={PAD.left}
            x2={PAD.left + INNER_W}
            y1={yOf(0)}
            y2={yOf(0)}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {data.map((d, i) => {
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text key={d.month} x={xOf(i)} y={PAD.top + INNER_H + 18} textAnchor="middle" fontSize="9" fill="var(--color-faint)">
              {monthLabel(d.month)}
            </text>
          );
        })}
      </svg>
      {anyEstimated && (
        <p className="mt-2 text-xs text-faint">Some months are estimated from current costs (no cost history before tracking began).</p>
      )}
    </div>
  );
}
