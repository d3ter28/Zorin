"use client";
import Link from "next/link";
import { ModelHealthBadge } from "./ModelHealthBadge";
import { useCallback, useEffect, useState } from "react";
import { CogsInput } from "./CogsInput";
import { ProductThumbnail } from "./ProductThumbnail";
import { formatCents, pct } from "@/lib/money";

interface Row {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  imageUrl: string | null;
  margin: number | null;
  recommendedAction: "raise" | "lower" | "hold" | null;
  suggestedPrice: number | null;
  modelHealth: { r2: number; dataPoints: number; confidenceScore: number } | null;
}

const FLOOR = 0.15;

export function ProductsTable({ refreshToken }: { refreshToken: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("load failed");
      const data: Row[] = await res.json();
      setRows(data);
      // Pre-select every product with an actionable (non-hold) recommendation.
      setSelected(
        new Set(data.filter((r) => r.recommendedAction === "raise" || r.recommendedAction === "lower").map((r) => r.id)),
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
      const res = await fetch("/api/products/bulk-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected] }),
      });
      if (!res.ok) throw new Error("bulk apply failed");
      const data = (await res.json()) as {
        applied: number;
        failed: { id: string; title: string; reason: string }[];
      };
      if (data.failed.length > 0) {
        const failList = data.failed.map((f) => `${f.title}: ${f.reason}`).join("\n");
        setError(
          data.applied > 0
            ? `Applied ${data.applied} price${data.applied === 1 ? "" : "s"}. ${data.failed.length} failed to sync to Shopify:\n${failList}`
            : `Failed to sync to Shopify:\n${failList}`,
        );
      } else {
        setSelected(new Set());
      }
      await load();
    } catch {
      setError("Couldn't apply changes — try again.");
    } finally {
      setApplying(false);
    }
  }

  async function refreshAll() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) throw new Error("refresh failed");
      const { refreshed, failed } = await res.json() as { refreshed: number; failed: number };
      await load();
      if (failed > 0) {
        setRefreshMsg(`Refreshed ${refreshed} price${refreshed === 1 ? "" : "s"}, ${failed} failed.`);
      } else {
        setRefreshMsg(`Refreshed ${refreshed} price${refreshed === 1 ? "" : "s"}.`);
      }
    } catch {
      setRefreshMsg("Couldn't refresh prices — try again.");
    } finally {
      setRefreshing(false);
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
      {rows.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <button
            className="btn btn-ghost"
            disabled={refreshing}
            onClick={refreshAll}
          >
            {refreshing ? "Refreshing…" : "Refresh all prices"}
          </button>
          <span className="text-xs text-muted" aria-live="polite">
            {refreshMsg}
          </span>
        </div>
      )}
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
              <th scope="col" className="py-3 pr-3 font-medium">
                Model
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Recommendation
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const belowFloor = r.margin !== null && r.margin < FLOOR;
              const actionable = r.recommendedAction === "raise" || r.recommendedAction === "lower";
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
                    <div className="flex items-center gap-3">
                      <ProductThumbnail imageUrl={r.imageUrl} alt={r.title} size={32} />
                      <div>
                        <Link
                          className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                          href={`/product/${r.id}`}
                        >
                          {r.title}
                        </Link>
                        <div className="text-xs text-faint">{r.sku}</div>
                      </div>
                    </div>
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
                  <td className="py-3 pr-3">
                    <ModelHealthBadge
                      r2={r.modelHealth?.r2 ?? null}
                      dataPoints={r.modelHealth?.dataPoints ?? null}
                      confidenceScore={r.modelHealth?.confidenceScore ?? null}
                      size="sm"
                    />
                  </td>
                  <td className="py-3 pr-4 text-right tabular">
                    {actionable && r.suggestedPrice != null ? (
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
                    ) : r.recommendedAction === "hold" ? (
                      <span className="text-faint">Hold</span>
                    ) : (
                      <span className="text-faint">—</span>
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
                <span className="whitespace-pre-line text-sm text-danger">{error}</span>
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
