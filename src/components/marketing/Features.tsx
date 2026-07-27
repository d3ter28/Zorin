"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MathOperations, Sliders, ShieldCheck, ChartBar } from "@phosphor-icons/react";

const MIN_PRICE = 49;
const MAX_PRICE = 99;

function calcLift(price: number): number {
  // Quadratic revenue-lift curve peaking near the profit-optimal price
  return -0.04 * Math.pow(price - 76, 2) + 14;
}

const catalogRows = [
  { sku: "WH-4821", name: "Wireless Headphones", action: "RAISE", lift: "+18.3%" },
  { sku: "KB-2201", name: "Mechanical Keyboard", action: "LOWER", lift: "+6.1%" },
  { sku: "MS-0934", name: "Ergonomic Mouse", action: "HOLD", lift: "—" },
  { sku: "SC-1102", name: "USB-C Hub", action: "RAISE", lift: "+11.7%" },
];

const actionStyle: Record<string, string> = {
  RAISE: "bg-blue-50 text-blue-600",
  LOWER: "bg-amber-50 text-amber-600",
  HOLD: "bg-zinc-100 text-zinc-500",
};

export function Features() {
  const reduce = useReducedMotion();
  const [sliderPrice, setSliderPrice] = useState(72);

  const lift = calcLift(sliderPrice);
  const trackPct = ((sliderPrice - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100;

  const features = [
    {
      icon: MathOperations,
      title: "Elasticity modeling",
      body: "Our statistical model learns how demand shifts with price for every SKU in your catalog.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-100/80 p-4">
            <p className="font-mono text-xs text-zinc-400">Elasticity</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-800">-1.47</p>
            <p className="mt-1 text-xs text-zinc-400">Elastic demand</p>
          </div>
          <div className="rounded-lg bg-zinc-100/80 p-4">
            <p className="font-mono text-xs text-zinc-400">R-squared</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-800">0.91</p>
            <p className="mt-1 text-xs text-zinc-400">Strong fit</p>
          </div>
        </div>
      ),
    },
    {
      icon: ChartBar,
      title: "Promotion detection",
      body: "Automatically flags promotional spikes in your sales history so they don't skew the model.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6">
          <svg viewBox="0 0 200 80" className="w-full" aria-hidden>
            {/* baseline bars */}
            {[12,18,15,14,17,13,16,15,19,14,16,18,13,15,17].map((h, i) => (
              <rect key={i} x={i * 13 + 2} y={80 - h * 2.8} width={10} height={h * 2.8}
                rx={2} className="fill-zinc-100" />
            ))}
            {/* promo spike bars */}
            {[{ i: 4, h: 38 }, { i: 5, h: 42 }, { i: 11, h: 36 }, { i: 12, h: 40 }].map(({ i, h }) => (
              <rect key={i} x={i * 13 + 2} y={80 - h * 2.8} width={10} height={h * 2.8}
                rx={2} className="fill-amber-300" />
            ))}
          </svg>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-zinc-200" />
              Normal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-300" />
              Promo flagged, excluded from model
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: Sliders,
      title: "What-if simulator",
      body: "Drag the slider to test any price point and see the projected revenue lift in real time.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>${MIN_PRICE}</span>
            <span className="font-mono font-semibold text-blue-600">
              ${sliderPrice}
            </span>
            <span>${MAX_PRICE}</span>
          </div>

          {/* Track + invisible range input overlay */}
          <div className="relative flex items-center">
            <div className="h-1.5 w-full rounded-full bg-zinc-100">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-none"
                style={{ width: `${trackPct}%` }}
              />
            </div>
            {/* Thumb dot */}
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-blue-500 shadow-md"
              style={{ left: `${trackPct}%` }}
            />
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              value={sliderPrice}
              onChange={(e) => setSliderPrice(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <p className="font-mono text-xs text-zinc-400">
            Projected lift:{" "}
            <span
              className={
                lift >= 0
                  ? "text-blue-600"
                  : "text-red-500"
              }
            >
              {lift >= 0 ? "+" : ""}
              {lift.toFixed(1)}%
            </span>
          </p>
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      title: "Confidence you can act on",
      body: "Every recommendation comes with a confidence score based on data density and model fit, so you know when to trust it.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6 space-y-2">
          {[
            { label: "Data points", value: "1,247" },
            { label: "Model confidence", value: "High" },
            { label: "Recommendation", value: "Raise" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0"
            >
              <span className="text-xs text-zinc-400">{row.label}</span>
              <span className="font-mono text-xs font-medium text-zinc-700">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: ChartBar,
      title: "Your whole catalog, at a glance",
      body: "See every product's recommendation and estimated profit lift in one view. Apply them individually or all at once.",
      span: "md:col-span-2",
      visual: (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-3 py-2 text-left font-medium text-zinc-400">Product</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-400">Action</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-400">Est. lift</th>
              </tr>
            </thead>
            <tbody>
              {catalogRows.map((row, i) => (
                <tr
                  key={row.sku}
                  className={`border-b border-zinc-100 last:border-0 ${i % 2 === 1 ? "bg-zinc-50/50" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-zinc-700">{row.name}</span>
                    <span className="ml-2 font-mono text-zinc-400">{row.sku}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${actionStyle[row.action]}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium text-zinc-700">
                    {row.lift}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="scroll-mt-20 bg-zinc-50/50">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Built for merchants who care about margin
        </h2>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className={`rounded-xl border border-zinc-200 bg-white p-7 ${f.span}`}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {Icon && (
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon size={20} weight="duotone" />
                  </div>
                )}
                <h3 className="text-base font-semibold text-zinc-900">
                  {f.title}
                </h3>
                <p className="mt-2 max-w-[55ch] text-sm leading-relaxed text-zinc-500">
                  {f.body}
                </p>
                {f.visual}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
