"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";
import { ModelHealthBadge } from "./ModelHealthBadge";

interface ModelData {
  elasticity: number;
  intercept: number;
  r2: number;
  dataPoints: number;
  currentPriceCents: number;
  confidenceScore?: number | null;
}

interface Props {
  productId: string;
  suggestedPriceCents: number | null;
}

const W = 480;
const H = 220;
const PAD = { top: 16, right: 20, bottom: 40, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const STEPS = 60;

function estimateUnits(priceCents: number, elasticity: number, intercept: number): number {
  return Math.exp(intercept + elasticity * Math.log(priceCents));
}

function buildPoints(model: ModelData) {
  const { elasticity, intercept, currentPriceCents } = model;
  const lo = currentPriceCents * 0.55;
  const hi = currentPriceCents * 1.55;

  const pts: { price: number; units: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const price = lo + (hi - lo) * (i / STEPS);
    const units = estimateUnits(price, elasticity, intercept);
    pts.push({ price, units });
  }

  const minUnits = Math.min(...pts.map((p) => p.units));
  const maxUnits = Math.max(...pts.map((p) => p.units));

  function toSvg(price: number, units: number) {
    const x = PAD.left + ((price - lo) / (hi - lo)) * PLOT_W;
    const y = PAD.top + PLOT_H - ((units - minUnits) / (maxUnits - minUnits || 1)) * PLOT_H;
    return { x, y };
  }

  const path = pts
    .map((p, i) => {
      const { x, y } = toSvg(p.price, p.units);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return { pts, lo, hi, minUnits, maxUnits, path, toSvg };
}

function PriceMarker({
  price,
  lo,
  hi,
  model,
  label,
  color,
}: {
  price: number;
  lo: number;
  hi: number;
  model: ModelData;
  label: string;
  color: string;
}) {
  const x = PAD.left + ((price - lo) / (hi - lo)) * PLOT_W;
  if (x < PAD.left || x > W - PAD.right) return null;
  const units = estimateUnits(price, model.elasticity, model.intercept);
  return (
    <g>
      <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + PLOT_H} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      <text x={x} y={PAD.top - 4} textAnchor="middle" fontSize="9" fill={color} fontFamily="var(--font-geist-mono, monospace)">
        {label}
      </text>
      <text x={x} y={PAD.top + PLOT_H + 28} textAnchor="middle" fontSize="8" fill={color} fontFamily="var(--font-geist-mono, monospace)">
        ~{Math.round(units)} units
      </text>
    </g>
  );
}

export function DemandCurve({ productId, suggestedPriceCents }: Props) {
  const [model, setModel] = useState<ModelData | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${productId}/demand-curve`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setModel(d))
      .catch(() => active && setModel(null));
    return () => { active = false; };
  }, [productId]);

  if (model === undefined) {
    return (
      <div className="h-[220px] animate-pulse rounded-xl border border-line bg-panel" />
    );
  }

  if (model === null) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface text-center">
        <div>
          <p className="text-sm font-medium text-ink">No demand curve yet</p>
          <p className="mt-1 text-xs text-muted">Fit an elasticity model to see how demand responds to price changes.</p>
        </div>
      </div>
    );
  }

  const { pts, lo, hi, minUnits, maxUnits, path, toSvg } = buildPoints(model);
  const yRange = maxUnits - minUnits || 1;

  // Y axis ticks (3 ticks)
  const yTicks = [minUnits, minUnits + yRange * 0.5, maxUnits].map((u) => ({
    units: u,
    y: PAD.top + PLOT_H - ((u - minUnits) / yRange) * PLOT_H,
  }));

  // X axis ticks (4 ticks at even price intervals)
  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const price = lo + ((hi - lo) * i) / xTickCount;
    const x = PAD.left + (i / xTickCount) * PLOT_W;
    return { price, x };
  });

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Demand curve</h3>
          <p className="mt-0.5 text-xs text-muted">Estimated units sold at each price point</p>
        </div>
        <ModelHealthBadge r2={model.r2} dataPoints={model.dataPoints} confidenceScore={model.confidenceScore ?? null} size="sm" />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        aria-label="Demand curve chart"
        role="img"
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.left} y1={t.y} x2={PAD.left + PLOT_W} y2={t.y}
            stroke="var(--color-line)" strokeWidth="1" />
        ))}

        {/* Y axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 6} y={t.y + 3.5} textAnchor="end"
            fontSize="9" fill="var(--color-faint)" fontFamily="var(--font-geist-mono, monospace)">
            {Math.round(t.units)}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((t, i) => (
          <text key={i} x={t.x} y={PAD.top + PLOT_H + 14} textAnchor="middle"
            fontSize="9" fill="var(--color-faint)" fontFamily="var(--font-geist-mono, monospace)">
            {formatCents(Math.round(t.price))}
          </text>
        ))}

        {/* Axis lines */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H}
          stroke="var(--color-line-strong)" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
          stroke="var(--color-line-strong)" strokeWidth="1" />

        {/* Area fill */}
        <defs>
          <linearGradient id={`dcg-${productId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.01" />
          </linearGradient>
          <clipPath id={`dcc-${productId}`}>
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>
        <path
          d={`${path} L${(PAD.left + PLOT_W).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} Z`}
          fill={`url(#dcg-${productId})`}
          clipPath={`url(#dcc-${productId})`}
        />

        {/* Curve line */}
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#dcc-${productId})`} />

        {/* Price markers */}
        <PriceMarker
          price={model.currentPriceCents}
          lo={lo} hi={hi} model={model}
          label="Now"
          color="var(--color-ink)"
        />
        {suggestedPriceCents !== null && suggestedPriceCents !== model.currentPriceCents && (
          <PriceMarker
            price={suggestedPriceCents}
            lo={lo} hi={hi} model={model}
            label="Rec."
            color="var(--color-positive)"
          />
        )}
      </svg>
    </div>
  );
}
