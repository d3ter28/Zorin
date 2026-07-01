"use client";
import { useState } from "react";
import { formatCents } from "@/lib/money";

interface Competitor {
  name: string;
  price: number;
  url: string;
  lastObservedAt: string; // ISO
  isStale: boolean;
}

// Human-friendly "time since" for a competitor's last confirmed price.
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ManageCompetitors({
  productId,
  competitors,
}: {
  productId: string;
  competitors: Competitor[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/refresh`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("refresh failed");
      // Reload so refreshed prices, status lines, and recommendation all update.
      window.location.reload();
    } catch {
      setError("Couldn't refresh prices — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Competitors</h2>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={refresh}
        >
          {busy ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {competitors.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No competitor prices yet. Import a CSV from the dashboard.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line text-sm">
          {competitors.map((c, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <div>
                <span className="text-muted">{c.name}</span>
                <div className="mt-0.5">
                  {c.isStale ? (
                    <span className="text-warning">⚠ stale</span>
                  ) : (
                    <span className="text-faint">
                      confirmed {relativeTime(c.lastObservedAt)}
                    </span>
                  )}
                  {c.url === "" && (
                    <span className="text-faint">
                      {" "}
                      · no URL — add one via CSV to enable auto-refresh
                    </span>
                  )}
                </div>
              </div>
              <span className="tabular text-ink">{formatCents(c.price)}</span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
