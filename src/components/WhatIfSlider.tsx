"use client";
import { useState } from "react";
import { formatCents, pct } from "@/lib/money";
import { marginPct } from "@/lib/margin";

export function WhatIfSlider({
  productId,
  currentPrice,
  cogs,
  compMedian,
  suggestedPrice,
}: {
  productId: string;
  currentPrice: number;
  cogs: number | null;
  compMedian: number | null;
  suggestedPrice: number | null;
}) {
  // Open the range wide enough to span both the current and suggested prices.
  const lo = Math.min(currentPrice, suggestedPrice ?? currentPrice);
  const hi = Math.max(currentPrice, suggestedPrice ?? currentPrice);
  const min = Math.round(lo * 0.5);
  const max = Math.round(hi * 1.5);

  // Start on the recommended price so Apply is one click away, but let the
  // merchant drag to any value they prefer (manual override).
  const [price, setPrice] = useState(suggestedPrice ?? currentPrice);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const margin = marginPct(price, cogs);
  const vsMedian =
    compMedian && compMedian > 0 ? (price - compMedian) / compMedian : null;

  async function apply() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });
      if (!res.ok) throw new Error("apply failed");
      // Reload so the current price, slider, and recommendation all refresh.
      window.location.reload();
    } catch {
      setError("Couldn't apply price — try again.");
      setApplying(false);
    }
  }

  return (
    <div className="rounded border p-4">
      <div className="mb-2 font-medium">Set price: {formatCents(price)}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={50}
        value={price}
        className="w-full"
        aria-label="Set price"
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <div className="mt-2 text-sm text-gray-600">
        Margin: {margin === null ? "—" : pct(margin)} · vs median:{" "}
        {vsMedian === null ? "—" : pct(vsMedian)}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          disabled={applying || price === currentPrice}
          onClick={apply}
        >
          {applying ? "Applying…" : `Apply ${formatCents(price)}`}
        </button>
        {price === currentPrice && (
          <span className="text-xs text-gray-400">Already the current price</span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
