"use client";

import { useState } from "react";

function parseInput(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ProfitMarginCalculator() {
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [shipping, setShipping] = useState("");

  const priceNum = parseInput(price);
  const costNum = parseInput(cost);
  const shippingNum = parseInput(shipping) ?? 0;

  const hasResult = priceNum !== null && priceNum > 0 && costNum !== null;
  const profit = hasResult ? priceNum! - costNum! - shippingNum : null;
  const marginPct = hasResult && profit !== null ? (profit / priceNum!) * 100 : null;

  const fields = [
    { id: "price", label: "Selling price", value: price, setValue: setPrice, placeholder: "29.99" },
    { id: "cost", label: "Unit cost", value: cost, setValue: setCost, placeholder: "12.00" },
    { id: "shipping", label: "Shipping cost", value: shipping, setValue: setShipping, placeholder: "3.50" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5">
            <label htmlFor={f.id} className="text-sm font-medium text-zinc-700">
              {f.label}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <span className="text-sm text-zinc-400">$</span>
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
          <p className="text-xs text-zinc-500">Profit per unit</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900">
            {profit !== null ? `$${profit.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className={`rounded-lg p-4 ${marginPct !== null && marginPct < 0 ? "bg-red-50" : "bg-blue-50"}`}>
          <p className={`text-xs ${marginPct !== null && marginPct < 0 ? "text-red-600" : "text-blue-600"}`}>
            Margin
          </p>
          <p className={`mt-1 font-mono text-2xl font-semibold ${marginPct !== null && marginPct < 0 ? "text-red-700" : "text-blue-700"}`}>
            {marginPct !== null ? `${marginPct.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-zinc-700">
        Tired of manual math? Zorin uses Machine Learning Models to optimize this across your whole catalog automatically.{" "}
        <a href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
          Start your free trial →
        </a>
      </div>
    </div>
  );
}
