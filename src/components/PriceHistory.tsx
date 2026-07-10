"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface Change {
  id: string;
  fromCents: number;
  toCents: number;
  appliedAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PriceHistory({ productId }: { productId: string }) {
  const [changes, setChanges] = useState<Change[] | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${productId}/price-history`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => active && setChanges(d))
      .catch(() => active && setChanges([]));
    return () => { active = false; };
  }, [productId]);

  if (changes === undefined) {
    return (
      <div className="h-32 animate-pulse rounded-xl border border-line bg-panel" />
    );
  }

  if (changes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center">
        <p className="text-sm font-medium text-ink">No price changes yet</p>
        <p className="mt-1 text-xs text-muted">
          Changes will appear here when you apply a new price.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">Price change history</h3>
      <div className="mt-4 space-y-0">
        {changes.map((c, i) => {
          const delta = c.toCents - c.fromCents;
          const isUp = delta > 0;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-4 py-2.5 ${i < changes.length - 1 ? "border-b border-line" : ""}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isUp
                    ? "bg-[color:oklch(0.96_0.04_150)] text-positive"
                    : "bg-[color:oklch(0.96_0.04_65)] text-warning"
                }`}
              >
                {isUp ? "↑" : "↓"}
              </span>
              <div className="flex-1">
                <p className="text-sm text-ink">
                  <span className="tabular text-muted">{formatCents(c.fromCents)}</span>
                  {" → "}
                  <span className="tabular font-medium">{formatCents(c.toCents)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs tabular text-muted">{formatDate(c.appliedAt)}</p>
                <p className="text-[0.65rem] tabular text-faint">{formatTime(c.appliedAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
