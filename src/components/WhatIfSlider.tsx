"use client";
import { useState } from "react";
import { formatCents, pct } from "@/lib/money";
import { marginPct } from "@/lib/margin";

export function WhatIfSlider({
  productId,
  currentPrice,
  cogs,
  suggestedPrice,
  expectedProfitLiftPct,
}: {
  productId: string;
  currentPrice: number;
  cogs: number | null;
  suggestedPrice: number | null;
  expectedProfitLiftPct: number | null;
}) {
  // Open the range wide enough to span both the current and suggested prices.
  const lo = Math.min(currentPrice, suggestedPrice ?? currentPrice);
  const hi = Math.max(currentPrice, suggestedPrice ?? currentPrice);
  const min = Math.round(lo * 0.5);
  const max = Math.round(hi * 1.5);

  // Start on the recommended price so Apply is one click away, but let the
  // merchant drag the slider OR type an exact price (manual override).
  const start = suggestedPrice ?? currentPrice;
  const [price, setPrice] = useState(start);
  // Separate text state so partial input ("12", "12.", "12.5") types freely;
  // `price` (cents) stays the source of truth the slider and Apply read.
  const [priceText, setPriceText] = useState((start / 100).toFixed(2));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setFromCents(cents: number) {
    setPrice(cents);
    setPriceText((cents / 100).toFixed(2));
  }

  function onTypePrice(text: string) {
    setPriceText(text);
    const dollars = Number(text);
    if (text.trim() !== "" && Number.isFinite(dollars) && dollars >= 0) {
      setPrice(Math.round(dollars * 100));
    }
  }

  const margin = marginPct(price, cogs);

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
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">Set your price</h2>
        <span className="text-lg font-semibold tabular text-ink">
          {formatCents(price)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={50}
        value={price}
        className="mt-3 w-full accent-[var(--accent)]"
        aria-label="Set price with slider"
        onChange={(e) => setFromCents(Number(e.target.value))}
      />
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="price-input" className="text-xs text-muted">
          Or set exact price
        </label>
        <div className="flex items-center rounded-md border border-line bg-panel pl-2 focus-within:border-accent">
          <span className="text-sm text-muted">$</span>
          <input
            id="price-input"
            type="text"
            inputMode="decimal"
            value={priceText}
            aria-label="Set exact price"
            className="w-24 bg-transparent px-1 py-1 text-right text-sm tabular text-ink outline-none"
            onChange={(e) => onTypePrice(e.target.value)}
            onBlur={() => setPriceText((price / 100).toFixed(2))}
          />
        </div>
      </div>
      <div className="mt-2 flex gap-5 text-xs text-muted">
        <span>
          Margin:{" "}
          <span className="tabular text-ink">
            {margin === null ? "—" : pct(margin)}
          </span>
        </span>
        <span>
          Profit lift:{" "}
          <span className="tabular text-ink">
            {expectedProfitLiftPct === null ? "—" : pct(expectedProfitLiftPct)}
          </span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          className="btn btn-primary"
          disabled={applying || price === currentPrice || price <= 0}
          onClick={apply}
        >
          {applying ? "Applying…" : `Apply ${formatCents(price)}`}
        </button>
        {price <= 0 && (
          <span className="text-xs text-danger">Enter a price above $0</span>
        )}
        {price > 0 && price === currentPrice && (
          <span className="text-xs text-faint">Already the current price</span>
        )}
        {error && (
          <span className="text-xs text-danger" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
