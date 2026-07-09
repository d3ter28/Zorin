"use client";
import { useEffect, useState } from "react";
import { pct, formatCents } from "@/lib/money";

interface PortfolioData {
  totalProducts: number;
  avgMargin: number | null;
  avgProfitLiftPct: number | null;
  modelHealth: { strong: number; fair: number; weak: number; none: number };
  actions: { raise: number; lower: number; hold: number };
  belowFloor: number;
  profitOpportunityCents: number;
}

const FLOOR = 0.15;

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "danger" | "positive" | "warning";
}) {
  const colorMap = {
    danger: "text-danger",
    positive: "text-positive",
    warning: "text-warning",
  };
  const valueColor = accent ? colorMap[accent] : "text-ink";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-5 py-4">
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className={`text-2xl font-semibold tabular leading-none ${valueColor}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-faint">{sub}</span>}
    </div>
  );
}

export function PortfolioStats({
  refreshToken,
  onGoToProducts,
}: {
  refreshToken: number;
  onGoToProducts?: () => void;
}) {
  const [data, setData] = useState<PortfolioData | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/products/portfolio")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d && setData(d))
      .catch(() => {});
    return () => { active = false; };
  }, [refreshToken]);

  if (!data) {
    return (
      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const { totalProducts, avgMargin, avgProfitLiftPct, modelHealth, actions, belowFloor, profitOpportunityCents } = data;
  const actionable = actions.raise + actions.lower;

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="Products"
          value={String(totalProducts)}
          sub="in catalog"
        />
        <StatCard
          label="Actionable"
          value={String(actionable)}
          sub={actionable === 0 ? "all holding" : `${actions.raise} raise · ${actions.lower} lower`}
          accent={actionable > 0 ? "positive" : undefined}
        />
        <StatCard
          label="Below margin floor"
          value={String(belowFloor)}
          sub="< 15% margin"
          accent={belowFloor > 0 ? "danger" : undefined}
        />
        <StatCard
          label="Avg profit lift"
          value={
            avgProfitLiftPct !== null
              ? `${avgProfitLiftPct >= 0 ? "+" : ""}${pct(avgProfitLiftPct)}`
              : "—"
          }
          sub={avgMargin !== null ? `avg margin ${pct(avgMargin)}` : "no margin data"}
          accent={
            avgProfitLiftPct !== null && avgProfitLiftPct > 0
              ? "positive"
              : avgProfitLiftPct !== null && avgProfitLiftPct < 0
                ? "warning"
                : undefined
          }
        />
        {profitOpportunityCents > 0 ? (
          <StatCard
            label="Profit Opportunity"
            value={`+${formatCents(Math.round(profitOpportunityCents))}`}
            sub="est. if all recs applied"
            accent="positive"
          />
        ) : (
          <div className="flex flex-col gap-1 rounded-xl border border-dashed border-line bg-surface px-5 py-4">
            <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
              Profit Opportunity
            </span>
            <p className="mt-1 text-xs leading-snug text-muted">
              Fit models to unlock profit opportunities
            </p>
            {onGoToProducts && (
              <button
                onClick={onGoToProducts}
                className="mt-1 text-left text-xs font-medium text-accent hover:underline"
              >
                Go to Products →
              </button>
            )}
          </div>
        )}
      </div>

      {totalProducts > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-3">
          <span className="shrink-0 text-[0.7rem] font-medium uppercase tracking-wide text-muted">
            Model health
          </span>
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            {modelHealth.strong > 0 && (
              <div
                className="h-full bg-positive"
                style={{ width: `${(modelHealth.strong / totalProducts) * 100}%` }}
              />
            )}
            {modelHealth.fair > 0 && (
              <div
                className="h-full bg-accent"
                style={{ width: `${(modelHealth.fair / totalProducts) * 100}%` }}
              />
            )}
            {modelHealth.weak > 0 && (
              <div
                className="h-full bg-warning"
                style={{ width: `${(modelHealth.weak / totalProducts) * 100}%` }}
              />
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {modelHealth.strong > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-positive" />
                {modelHealth.strong} strong
              </span>
            )}
            {modelHealth.fair > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                {modelHealth.fair} fair
              </span>
            )}
            {modelHealth.weak > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-warning" />
                {modelHealth.weak} weak
              </span>
            )}
            {modelHealth.none > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-line-strong" />
                {modelHealth.none} none
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
