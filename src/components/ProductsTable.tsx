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

function Position({ pctVsMedian }: { pctVsMedian: number | null }) {
  if (pctVsMedian === null) return <span className="text-faint">—</span>;
  if (pctVsMedian > 0.1) return <span className="text-warning">Above market</span>;
  if (pctVsMedian < -0.1) return <span className="text-accent">Below market</span>;
  return <span className="text-muted">At market</span>;
}

export function ProductsTable({ refreshToken }: { refreshToken: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("load failed");
      const data: Row[] = await res.json();
      setRows(data);
      // Pre-select every product with an actionable (non-hold) recommendation.
      setSelected(
        new Set(data.filter((r) => r.recommendedAction !== "hold").map((r) => r.id)),
      );
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

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
      // Refresh in place; applied rows become "hold" so the bar clears itself.
      await load();
    } catch {
      setError("Couldn't apply changes — try again.");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-panel" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-danger">Couldn&apos;t load products.</p>
        <button
          className="btn btn-ghost mt-3"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-surface p-10 text-center">
        <h2 className="text-sm font-semibold text-ink">No products yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Import competitor prices above to see pricing recommendations across your
          catalog.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wide text-muted">
              <th scope="col" className="w-10 py-3 pl-4"></th>
              <th scope="col" className="py-3 pr-3 font-medium">
                Product
              </th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">
                Price
              </th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">
                COGS
              </th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">
                Margin
              </th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">
                Comp. median
              </th>
              <th scope="col" className="py-3 pr-3 font-medium">
                Position
              </th>
              <th
                scope="col"
                className="py-3 pr-3 text-right font-medium"
                title="Estimated revenue change if priced at the competitor median, across estimated unit volume."
              >
                Est. impact
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Recommendation
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const belowFloor = r.margin !== null && r.margin < FLOOR;
              const impact =
                r.estUnits !== null && r.comparison.compMedian !== null
                  ? (r.comparison.compMedian - r.currentPrice) * r.estUnits
                  : null;
              const actionable = r.recommendedAction !== "hold";
              return (
                <tr
                  key={r.id}
                  className="border-b border-line last:border-0 transition-colors hover:bg-panel"
                >
                  <td className="py-3 pl-4">
                    {actionable && (
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--accent)]"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.title}`}
                      />
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                      href={`/product/${r.id}`}
                    >
                      {r.title}
                    </Link>
                    <div className="text-xs text-faint">{r.sku}</div>
                  </td>
                  <td className="py-3 pr-3 text-right tabular">
                    {formatCents(r.currentPrice)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <CogsInput
                      productId={r.id}
                      initialCents={r.cogs}
                      onSaved={load}
                      label={`Cost of goods for ${r.title}`}
                    />
                  </td>
                  <td
                    className={`py-3 pr-3 text-right tabular ${
                      belowFloor ? "font-semibold text-danger" : "text-ink"
                    }`}
                  >
                    {r.margin === null ? "—" : pct(r.margin)}
                    {belowFloor ? " ⚠" : ""}
                  </td>
                  <td className="py-3 pr-3 text-right tabular text-muted">
                    {r.comparison.compMedian === null
                      ? "—"
                      : formatCents(r.comparison.compMedian)}
                  </td>
                  <td className="py-3 pr-3">
                    <Position pctVsMedian={r.comparison.pctVsMedian} />
                  </td>
                  <td className="py-3 pr-3 text-right tabular text-muted">
                    {impact === null
                      ? "—"
                      : `${impact >= 0 ? "+" : "−"}${formatCents(Math.abs(impact))}`}
                  </td>
                  <td className="py-3 pr-4 text-right tabular">
                    {actionable ? (
                      <span
                        className={`font-medium ${
                          r.recommendedAction === "raise"
                            ? "text-positive"
                            : "text-warning"
                        }`}
                      >
                        {r.recommendedAction === "raise" ? "↑" : "↓"}{" "}
                        {formatCents(r.suggestedPrice)}
                      </span>
                    ) : (
                      <span className="text-faint">Hold</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div aria-live="polite">
              {error ? (
                <span className="text-sm text-danger">{error}</span>
              ) : (
                <span className="text-sm text-muted">
                  {selected.size} change{selected.size === 1 ? "" : "s"} selected
                </span>
              )}
            </div>
            <button
              className="btn btn-primary"
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
