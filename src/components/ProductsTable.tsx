"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CogsInput } from "./CogsInput";
import { formatCents, pct } from "@/lib/money";

interface Row {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  margin: number | null;
  comparison: {
    compMedian: number | null;
    pctVsMedian: number | null;
    competitorCount: number;
  };
  recommendedAction: "raise" | "lower" | "hold";
  suggestedPrice: number;
}

const FLOOR = 0.15;

function positionBadge(pctVsMedian: number | null): string {
  if (pctVsMedian === null) return "—";
  if (pctVsMedian > 0.1) return "Above market";
  if (pctVsMedian < -0.1) return "Below market";
  return "At market";
}

export function ProductsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const data: Row[] = await res.json();
    setRows(data);
    // Pre-select every product that has an actionable (non-hold) recommendation.
    setSelected(
      new Set(data.filter((r) => r.recommendedAction !== "hold").map((r) => r.id)),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applySelected() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/apply/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected] }),
      });
      if (!res.ok) throw new Error("bulk apply failed");
      // Reload so the table reflects new prices and cleared recommendations.
      if (typeof window !== "undefined") window.location.reload();
    } catch {
      setError("Couldn't apply changes — try again.");
      setApplying(false);
    }
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="w-8 py-2"></th>
            <th>Product</th>
            <th>Price</th>
            <th>COGS</th>
            <th>Margin</th>
            <th>Comp. median</th>
            <th>Position</th>
            <th>Opportunity</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const belowFloor = r.margin !== null && r.margin < FLOOR;
            const opp =
              r.estUnits !== null && r.comparison.compMedian !== null
                ? (r.comparison.compMedian - r.currentPrice) * r.estUnits
                : null;
            const actionable = r.recommendedAction !== "hold";
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2">
                  {actionable && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.title}`}
                    />
                  )}
                </td>
                <td className="py-2">
                  <Link className="font-medium underline" href={`/product/${r.id}`}>
                    {r.title}
                  </Link>
                  <div className="text-xs text-gray-400">{r.sku}</div>
                </td>
                <td>{formatCents(r.currentPrice)}</td>
                <td>
                  <CogsInput productId={r.id} initialCents={r.cogs} onSaved={load} />
                </td>
                <td className={belowFloor ? "font-semibold text-red-600" : ""}>
                  {r.margin === null ? "—" : pct(r.margin)}
                  {belowFloor ? " ⚠" : ""}
                </td>
                <td>
                  {r.comparison.compMedian === null
                    ? "—"
                    : formatCents(r.comparison.compMedian)}
                </td>
                <td>{positionBadge(r.comparison.pctVsMedian)}</td>
                <td>{opp === null ? "—" : formatCents(opp)}</td>
                <td>
                  {actionable ? (
                    <span>
                      {formatCents(r.currentPrice)} → {formatCents(r.suggestedPrice)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Hold</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4 shadow">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div>
              {error ? (
                <span className="text-sm text-red-600">{error}</span>
              ) : (
                <span className="text-sm text-gray-600">
                  {selected.size} change{selected.size === 1 ? "" : "s"} selected
                </span>
              )}
            </div>
            <button
              className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={applying}
              onClick={applySelected}
            >
              {applying
                ? "Applying…"
                : `Apply ${selected.size} change${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
