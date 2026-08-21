"use client";

import { useState } from "react";

function parseInput(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

interface RegionPreset {
  label: string;
  feePct: string;
  feeFixed: string;
}

const REGIONS: Record<string, RegionPreset> = {
  us: { label: "United States", feePct: "2.9", feeFixed: "0.30" },
  uk: { label: "United Kingdom", feePct: "2.5", feeFixed: "0.25" },
  eu: { label: "European Union", feePct: "2.5", feeFixed: "0.25" },
  ca: { label: "Canada", feePct: "2.9", feeFixed: "0.30" },
  au: { label: "Australia", feePct: "2.6", feeFixed: "0.30" },
};

export function ProfitMarginCalculator() {
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [shipping, setShipping] = useState("");
  const [region, setRegion] = useState("us");
  const [feePct, setFeePct] = useState(REGIONS.us.feePct);
  const [feeFixed, setFeeFixed] = useState(REGIONS.us.feeFixed);
  const [adSpend, setAdSpend] = useState("");

  function handleRegionChange(next: string) {
    setRegion(next);
    const preset = REGIONS[next];
    if (preset) {
      setFeePct(preset.feePct);
      setFeeFixed(preset.feeFixed);
    }
  }

  const priceNum = parseInput(price);
  const costNum = parseInput(cost);
  const shippingNum = parseInput(shipping) ?? 0;
  const feePctNum = parseInput(feePct) ?? 0;
  const feeFixedNum = parseInput(feeFixed) ?? 0;
  const adSpendNum = parseInput(adSpend) ?? 0;

  const hasResult = priceNum !== null && priceNum > 0 && costNum !== null;
  const paymentFee = hasResult ? priceNum! * (feePctNum / 100) + feeFixedNum : null;
  const profit =
    hasResult && paymentFee !== null
      ? priceNum! - costNum! - shippingNum - paymentFee - adSpendNum
      : null;
  const marginPct = hasResult && profit !== null ? (profit / priceNum!) * 100 : null;

  const coreFields = [
    { id: "price", label: "Selling price", value: price, setValue: setPrice, placeholder: "29.99" },
    { id: "cost", label: "Unit cost", value: cost, setValue: setCost, placeholder: "12.00" },
    { id: "shipping", label: "Shipping cost", value: shipping, setValue: setShipping, placeholder: "3.50" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-3">
        {coreFields.map((f) => (
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

      <div className="mt-8 border-t border-zinc-100 pt-6">
        <p className="text-sm font-medium text-zinc-700">Payment processing fee</p>
        <p className="mt-1 text-xs text-zinc-500">
          Defaults to a typical Shopify Payments rate for your region - edit if your plan or
          processor differs.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="region" className="text-sm font-medium text-zinc-700">
              Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {Object.entries(REGIONS).map(([id, r]) => (
                <option key={id} value={id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feePct" className="text-sm font-medium text-zinc-700">
              Fee rate
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <input
                id="feePct"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                className="h-10 w-full bg-transparent text-sm text-zinc-900 focus:outline-none"
              />
              <span className="text-sm text-zinc-400">%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feeFixed" className="text-sm font-medium text-zinc-700">
              Fixed fee per order
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <span className="text-sm text-zinc-400">$</span>
              <input
                id="feeFixed"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={feeFixed}
                onChange={(e) => setFeeFixed(e.target.value)}
                className="h-10 w-full bg-transparent text-sm text-zinc-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-100 pt-6">
        <p className="text-sm font-medium text-zinc-700">Ad spend per order (optional)</p>
        <p className="mt-1 text-xs text-zinc-500">
          Add your customer acquisition cost to see net profit after marketing, not just
          gross-of-marketing margin.
        </p>
        <div className="mt-4 max-w-[200px]">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
            <span className="text-sm text-zinc-400">$</span>
            <input
              id="adSpend"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={adSpend}
              onChange={(e) => setAdSpend(e.target.value)}
              className="h-10 w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 border-t border-zinc-100 pt-8 sm:grid-cols-3">
        <div className="rounded-lg bg-zinc-50 p-4">
          <p className="text-xs text-zinc-500">Payment fee</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900">
            {paymentFee !== null ? `$${paymentFee.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-4">
          <p className="text-xs text-zinc-500">Net profit per unit</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900">
            {profit !== null ? `$${profit.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className={`rounded-lg p-4 ${marginPct !== null && marginPct < 0 ? "bg-red-50" : "bg-blue-50"}`}>
          <p className={`text-xs ${marginPct !== null && marginPct < 0 ? "text-red-600" : "text-blue-600"}`}>
            Net margin
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
