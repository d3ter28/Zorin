"use client";

import { useEffect, useState } from "react";

interface SaleRow {
  id: string;
  date: string;
  priceCents: number;
  unitsSold: number;
  promotionFlag: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCents(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

export function PromotionFlags({
  productId,
  hasModel,
}: {
  productId: string;
  hasModel: boolean;
}) {
  const [rows, setRows] = useState<SaleRow[] | undefined>(undefined);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  function load() {
    fetch(`/api/products/${productId}/sales-records`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .catch(() => setRows([]));
  }

  useEffect(() => { load(); }, [productId]);

  async function autoDetect() {
    setDetecting(true);
    setDetectMsg(null);
    try {
      const res = await fetch(`/api/products/${productId}/flag-promotions`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Detection failed");
      }
      const { flagged, cleared } = await res.json();
      setDetectMsg(`${flagged} flagged, ${cleared} cleared`);
      load();
    } catch (e) {
      setDetectMsg(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  }

  async function toggleFlag(recordId: string, current: boolean) {
    setToggling(recordId);
    try {
      await fetch(`/api/products/${productId}/flag-promotions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, flagged: !current }),
      });
      setRows((prev) =>
        prev?.map((r) => r.id === recordId ? { ...r, promotionFlag: !current } : r),
      );
    } finally {
      setToggling(null);
    }
  }

  const flaggedCount = rows?.filter((r) => r.promotionFlag).length ?? 0;

  if (rows === undefined) {
    return <div className="h-24 animate-pulse rounded-xl border border-line bg-panel" />;
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Promotion flags</h3>
          <p className="mt-0.5 text-xs text-muted">
            Flagged records are excluded from model fitting.
            {flaggedCount > 0 && ` ${flaggedCount} flagged.`}
          </p>
        </div>
        <button
          className="btn btn-ghost shrink-0 text-xs"
          disabled={detecting || !hasModel}
          onClick={autoDetect}
          title={!hasModel ? "Fit a model first to auto-detect" : undefined}
        >
          {detecting ? "Detecting…" : "Auto-detect"}
        </button>
      </div>

      {detectMsg && (
        <p className="mt-2 text-xs text-muted" role="status">{detectMsg}</p>
      )}

      <div className="mt-4 max-h-80 overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[0.65rem] uppercase tracking-wide text-muted">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 text-right font-medium">Price</th>
              <th className="pb-2 pr-4 text-right font-medium">Units</th>
              <th className="pb-2 text-right font-medium">Promo?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-line last:border-0 ${r.promotionFlag ? "bg-warning/5" : ""}`}
              >
                <td className="py-2 pr-4 text-muted">{formatDate(r.date)}</td>
                <td className="py-2 pr-4 text-right tabular text-muted">
                  {formatCents(r.priceCents)}
                </td>
                <td className="py-2 pr-4 text-right tabular font-medium text-ink">
                  {r.unitsSold.toLocaleString()}
                  {r.promotionFlag && (
                    <span className="ml-1.5 text-[0.6rem] font-semibold uppercase tracking-wide text-warning">
                      promo
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <button
                    className={`text-[0.65rem] font-medium transition-colors ${
                      r.promotionFlag
                        ? "text-warning hover:text-ink"
                        : "text-faint hover:text-ink"
                    }`}
                    disabled={toggling === r.id}
                    onClick={() => toggleFlag(r.id, r.promotionFlag)}
                    aria-label={r.promotionFlag ? "Clear promotion flag" : "Mark as promotion"}
                  >
                    {toggling === r.id ? "…" : r.promotionFlag ? "Clear" : "Flag"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
