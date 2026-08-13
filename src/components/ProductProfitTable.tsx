"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface Row {
  productId: string;
  title: string;
  sku: string;
  units: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  marginPct: number | null;
  estimated: boolean;
}

const MARGIN_FLOOR = 0.15;
type Mode = "earners" | "bleeders";
const WINDOWS = [30, 90, 365];

export function ProductProfitTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mode, setMode] = useState<Mode>("earners");
  const [windowDays, setWindowDays] = useState(90);

  useEffect(() => {
    let active = true;
    setRows(null);
    fetch(`/api/profit/products?window=${windowDays}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d: { products: Row[] }) => { if (active) setRows(d.products); })
      .catch(() => { if (active) setRows([]); });
    return () => { active = false; };
  }, [windowDays]);

  const sorted = rows
    ? [...rows].sort((a, b) =>
        mode === "earners"
          ? b.grossProfitCents - a.grossProfitCents
          : (a.marginPct ?? Infinity) - (b.marginPct ?? Infinity))
    : [];

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Per-product profit</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line text-xs">
            <button
              className={`px-2 py-1 ${mode === "earners" ? "bg-accent text-accent-fg" : "text-muted"}`}
              onClick={() => setMode("earners")}
            >
              Top earners
            </button>
            <button
              className={`px-2 py-1 ${mode === "bleeders" ? "bg-accent text-accent-fg" : "text-muted"}`}
              onClick={() => setMode("bleeders")}
            >
              Margin bleeders
            </button>
          </div>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            aria-label="Time window"
            className="rounded border border-line bg-panel px-2 py-1 text-xs text-ink"
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>
                Last {w} days
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows === null ? (
        <div className="h-40 animate-pulse rounded-lg bg-panel" />
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">
          No product profit data for this window. Add COGS and sync sales.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Units</th>
                <th className="px-2 py-2 font-medium">Revenue</th>
                <th className="px-2 py-2 font-medium">COGS</th>
                <th className="px-2 py-2 font-medium">Gross profit</th>
                <th className="px-2 py-2 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const belowFloor = r.marginPct !== null && r.marginPct < MARGIN_FLOOR;
                return (
                  <tr key={r.productId} className="border-b border-line last:border-0">
                    <td className="px-2 py-2 text-ink">
                      {r.title}
                      {r.estimated && (
                        <span className="ml-1 text-xs text-faint" title="Estimated from current costs">
                          est.
                        </span>
                      )}
                      <span className="block text-xs text-faint">{r.sku}</span>
                    </td>
                    <td className="px-2 py-2 text-muted tabular-nums">{r.units}</td>
                    <td className="px-2 py-2 text-ink tabular-nums">{formatCents(r.revenueCents)}</td>
                    <td className="px-2 py-2 text-muted tabular-nums">{formatCents(r.cogsCents)}</td>
                    <td className="px-2 py-2 tabular-nums text-positive">{formatCents(r.grossProfitCents)}</td>
                    <td className={`px-2 py-2 tabular-nums ${belowFloor ? "text-warning" : "text-muted"}`}>
                      {r.marginPct !== null ? `${(r.marginPct * 100).toFixed(0)}%` : "—"}
                      {belowFloor && <span className="ml-1 text-xs">below floor</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
