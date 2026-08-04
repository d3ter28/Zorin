"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calculateMarketStats } from "@/lib/pricing/marketStats";
import { dollarsToCents, formatCents } from "@/lib/money";

interface CompetitorPriceRow {
  id: string;
  competitorName: string;
  priceCents: number;
  url: string | null;
  capturedAt: string;
}

export function CompetitorPricesCard({ productId }: { productId: string }) {
  const [rows, setRows] = useState<CompetitorPriceRow[] | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRows() {
    const res = await fetch(`/api/products/${productId}/competitor-prices`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceCents = dollarsToCents(price);
    if (name.trim() === "" || priceCents === null || priceCents <= 0) {
      setError("Enter a competitor name and a valid price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/competitor-prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorName: name.trim(),
          priceCents,
          url: url.trim() === "" ? null : url.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to add competitor price");
      }
      setName("");
      setPrice("");
      setUrl("");
      await fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add competitor price");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${productId}/competitor-prices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to remove competitor price");
      }
      await fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove competitor price");
    } finally {
      setDeletingId(null);
    }
  }

  if (rows === null) {
    return <div className="h-32 animate-pulse rounded-xl border border-line bg-panel" />;
  }

  const stats =
    rows.length > 0
      ? calculateMarketStats(rows.map((r) => r.priceCents).sort((a, b) => a - b))
      : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Competitor prices</h3>
          <p className="mt-0.5 text-xs text-muted">
            Track what similar products cost elsewhere to benchmark this one against the market.
          </p>
        </div>
        <Link href={`/launch-planner?productId=${productId}`} className="btn btn-ghost text-xs whitespace-nowrap">
          Plan launch price →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-faint">
          No competitor prices yet — add one to benchmark this product against the market.
        </p>
      ) : (
        <>
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs text-muted">Min</p>
                <p className="mt-1 text-sm font-semibold tabular text-ink">{formatCents(stats.minCents)}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs text-muted">Median</p>
                <p className="mt-1 text-sm font-semibold tabular text-ink">{formatCents(stats.medianCents)}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs text-muted">Max</p>
                <p className="mt-1 text-sm font-semibold tabular text-ink">{formatCents(stats.maxCents)}</p>
              </div>
            </div>
          )}
          <div className="mt-4 divide-y divide-line">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  {row.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer" className="text-ink hover:underline">
                      {row.competitorName}
                    </a>
                  ) : (
                    <span className="text-ink">{row.competitorName}</span>
                  )}
                  <p className="text-xs text-faint">{new Date(row.capturedAt).toLocaleDateString()}</p>
                </div>
                <span className="tabular text-ink">{formatCents(row.priceCents)}</span>
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={deletingId === row.id}
                  aria-label={`Remove ${row.competitorName}`}
                  className="text-xs text-faint hover:text-danger disabled:opacity-50"
                >
                  {deletingId === row.id ? "Removing…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <form onSubmit={addRow} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Competitor
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink outline-none"
            placeholder="Acme Co"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink outline-none"
            placeholder="0.00"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted flex-1 min-w-[10rem]">
          Link (optional)
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink outline-none"
            placeholder="https://…"
          />
        </label>
        <button type="submit" disabled={saving} className="btn btn-ghost text-xs">
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
