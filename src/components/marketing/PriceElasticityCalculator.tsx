"use client";

import { useState } from "react";

function parseInput(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function PriceElasticityCalculator() {
  const [priceA, setPriceA] = useState("");
  const [unitsA, setUnitsA] = useState("");
  const [priceB, setPriceB] = useState("");
  const [unitsB, setUnitsB] = useState("");

  const p1 = parseInput(priceA);
  const q1 = parseInput(unitsA);
  const p2 = parseInput(priceB);
  const q2 = parseInput(unitsB);

  const hasResult =
    p1 !== null && p1 > 0 && q1 !== null && q1 > 0 && p2 !== null && p2 > 0 && q2 !== null && q2 > 0 && p1 !== p2;

  // Midpoint (arc) elasticity - symmetric regardless of price direction
  let elasticity: number | null = null;
  let revenueChangePct: number | null = null;

  if (hasResult) {
    const avgP = (p1! + p2!) / 2;
    const avgQ = (q1! + q2!) / 2;
    const pctChangeQ = (q2! - q1!) / avgQ;
    const pctChangeP = (p2! - p1!) / avgP;
    elasticity = pctChangeQ / pctChangeP;

    const revenue1 = p1! * q1!;
    const revenue2 = p2! * q2!;
    revenueChangePct = ((revenue2 - revenue1) / revenue1) * 100;
  }

  const absElasticity = elasticity !== null ? Math.abs(elasticity) : null;
  const classification =
    absElasticity === null
      ? null
      : absElasticity > 1.05
        ? "elastic"
        : absElasticity < 0.95
          ? "inelastic"
          : "unit elastic";

  const fields = [
    { id: "priceA", label: "Price A", value: priceA, setValue: setPriceA, placeholder: "29.99", prefix: "$" },
    { id: "unitsA", label: "Units sold at Price A", value: unitsA, setValue: setUnitsA, placeholder: "120", prefix: "" },
    { id: "priceB", label: "Price B", value: priceB, setValue: setPriceB, placeholder: "34.99", prefix: "$" },
    { id: "unitsB", label: "Units sold at Price B", value: unitsB, setValue: setUnitsB, placeholder: "95", prefix: "" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5">
            <label htmlFor={f.id} className="text-sm font-medium text-zinc-700">
              {f.label}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              {f.prefix && <span className="text-sm text-zinc-400">{f.prefix}</span>}
              <input
                id={f.id}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder={f.placeholder}
                value={f.value}
                onChange={(e) => f.setValue(e.target.value)}
                className="h-10 w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 border-t border-zinc-100 pt-8 sm:grid-cols-2">
        <div className="rounded-lg bg-zinc-50 p-4">
          <p className="text-xs text-zinc-500">Elasticity coefficient</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900">
            {elasticity !== null ? elasticity.toFixed(2) : "—"}
          </p>
          {classification && (
            <p className="mt-1 text-xs text-zinc-500 capitalize">Demand is {classification}</p>
          )}
        </div>
        <div
          className={`rounded-lg p-4 ${
            revenueChangePct !== null && revenueChangePct < 0 ? "bg-red-50" : "bg-blue-50"
          }`}
        >
          <p
            className={`text-xs ${
              revenueChangePct !== null && revenueChangePct < 0 ? "text-red-600" : "text-blue-600"
            }`}
          >
            Revenue impact
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold ${
              revenueChangePct !== null && revenueChangePct < 0 ? "text-red-700" : "text-blue-700"
            }`}
          >
            {revenueChangePct !== null
              ? `${revenueChangePct > 0 ? "+" : ""}${revenueChangePct.toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </div>

      {classification && (
        <p className="mt-6 text-sm text-zinc-500">
          {classification === "elastic" &&
            "A 1% price change moves demand by more than 1% in the opposite direction — your customers are price-sensitive. Small price increases can meaningfully reduce units sold."}
          {classification === "inelastic" &&
            "A 1% price change moves demand by less than 1% — your customers are relatively price-insensitive. There may be room to raise prices without losing many sales."}
          {classification === "unit elastic" &&
            "Demand moves proportionally with price — revenue stays roughly flat as price changes."}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-zinc-700">
        This calculator uses two data points. Zorin fits a full demand curve from your real order
        history — every SKU, updated automatically as new sales come in — and tells you the exact
        price that maximizes profit, not just revenue.{" "}
        <a href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
          Start your free trial →
        </a>
      </div>
    </div>
  );
}
