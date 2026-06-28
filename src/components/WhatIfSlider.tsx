"use client";
import { useState } from "react";
import { formatCents, pct } from "@/lib/money";
import { marginPct } from "@/lib/margin";

export function WhatIfSlider({
  currentPrice,
  cogs,
  compMedian,
}: {
  currentPrice: number;
  cogs: number | null;
  compMedian: number | null;
}) {
  const min = Math.round(currentPrice * 0.5);
  const max = Math.round(currentPrice * 1.5);
  const [price, setPrice] = useState(currentPrice);

  const margin = marginPct(price, cogs);
  const vsMedian =
    compMedian && compMedian > 0 ? (price - compMedian) / compMedian : null;

  return (
    <div className="rounded border p-4">
      <div className="mb-2 font-medium">What-if price: {formatCents(price)}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={50}
        value={price}
        className="w-full"
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <div className="mt-2 text-sm text-gray-600">
        Margin: {margin === null ? "—" : pct(margin)} · vs median:{" "}
        {vsMedian === null ? "—" : pct(vsMedian)}
      </div>
    </div>
  );
}
