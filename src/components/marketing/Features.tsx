"use client";

import { motion, useReducedMotion } from "motion/react";
import { MathOperations, ShieldCheck, ChartBar, ChatCenteredText } from "@phosphor-icons/react";

const catalogRows = [
  { sku: "WH-4821", name: "Wireless Headphones", action: "RAISE", lift: "+18.3%" },
  { sku: "KB-2201", name: "Mechanical Keyboard", action: "LOWER", lift: "+6.1%" },
  { sku: "MS-0934", name: "Ergonomic Mouse", action: "HOLD", lift: "-" },
  { sku: "SC-1102", name: "USB-C Hub", action: "RAISE", lift: "+11.7%" },
  { sku: "CS-7743", name: "Charging Cable", action: "LOWER", lift: "+4.2%" },
];

const actionStyle: Record<string, string> = {
  RAISE: "bg-blue-50 text-blue-600",
  LOWER: "bg-amber-50 text-amber-600",
  HOLD: "bg-zinc-100 text-zinc-500",
};

export function Features() {
  const reduce = useReducedMotion();

  const features = [
    {
      icon: MathOperations,
      title: "Elasticity modeling",
      body: "Our statistical model learns how demand shifts with price for every SKU in your catalog.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-100/80 p-4">
            <p className="font-mono text-xs text-zinc-500">Elasticity</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-800">-1.47</p>
            <p className="mt-1 text-xs text-zinc-500">Elastic demand</p>
          </div>
          <div className="rounded-lg bg-zinc-100/80 p-4">
            <p className="font-mono text-xs text-zinc-500">R-squared</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-800">0.91</p>
            <p className="mt-1 text-xs text-zinc-500">Strong fit</p>
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
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
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
      icon: ShieldCheck,
      title: "Confidence you can act on",
      body: "Every recommendation comes with a confidence score based on data density and model fit, so you know when to trust it.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6 space-y-2">
          {[
            { label: "Data points", value: "1,247", pill: null },
            { label: "Model confidence", value: "High", pill: "bg-emerald-50 text-emerald-600" },
            { label: "Recommendation", value: "Raise", pill: actionStyle.RAISE },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0"
            >
              <span className="text-xs text-zinc-500">{row.label}</span>
              {row.pill ? (
                <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${row.pill}`}>
                  {row.value}
                </span>
              ) : (
                <span className="font-mono text-xs font-medium text-zinc-700">{row.value}</span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: ChatCenteredText,
      title: "The Van Westendorp price sensitivity meter",
      body: "A classic pricing-research method: four price-perception questions, sent directly to your customers, reveal an acceptable price range and an optimal price point - real willingness-to-pay data alongside your elasticity model.",
      span: "md:col-span-1",
      visual: (
        <div className="mt-6">
          <svg viewBox="0 0 280 168" className="w-full" aria-hidden>
            {/* acceptable-range band between the two intersections */}
            <rect x="131" y="10" width="29" height="120" className="fill-blue-50" />
            {/* axes */}
            <line x1="34" y1="10" x2="34" y2="130" className="stroke-zinc-200" strokeWidth="1" />
            <line x1="34" y1="130" x2="264" y2="130" className="stroke-zinc-200" strokeWidth="1" />
            {/* y-axis label */}
            <text x="10" y="70" textAnchor="middle" fontSize="7.5" className="fill-zinc-400" fontFamily="var(--font-geist-mono, monospace)" transform="rotate(-90 10 70)">% of respondents</text>
            {/* y-axis ticks */}
            <text x="29" y="14" textAnchor="end" fontSize="7" className="fill-zinc-400" fontFamily="var(--font-geist-mono, monospace)">100%</text>
            <text x="29" y="133" textAnchor="end" fontSize="7" className="fill-zinc-400" fontFamily="var(--font-geist-mono, monospace)">0%</text>
            {/* x-axis label */}
            <text x="149" y="163" textAnchor="middle" fontSize="7.5" className="fill-zinc-400" fontFamily="var(--font-geist-mono, monospace)">Price →</text>
            {/* too cheap - steep decreasing */}
            <polyline
              points="34,25 74,45 114,70 154,92 194,107 234,116 264,122"
              className="stroke-red-400" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* good value - gentle decreasing */}
            <polyline
              points="34,18 74,30 114,50 154,76 194,101 234,119 264,129"
              className="stroke-emerald-400" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* getting expensive - gentle increasing */}
            <polyline
              points="34,132 74,116 114,90 154,64 194,41 234,24 264,14"
              className="stroke-violet-400" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* too expensive - steep increasing */}
            <polyline
              points="34,137 74,128 114,109 154,84 194,54 234,29 264,17"
              className="stroke-blue-500" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* intersection markers: point of marginal cheapness / expensiveness, sitting exactly on the crossing curves */}
            <circle cx="131" cy="79" r="3.5" className="fill-white stroke-zinc-500" strokeWidth="1.5">
              <title>Point of Marginal Cheapness - below this, respondents think the price is suspiciously cheap</title>
            </circle>
            <circle cx="160" cy="80" r="3.5" className="fill-white stroke-zinc-500" strokeWidth="1.5">
              <title>Point of Marginal Expensiveness - above this, respondents think the price is too expensive</title>
            </circle>
            <text x="131" y="146" textAnchor="middle" fontSize="8" className="fill-zinc-500 font-semibold" fontFamily="var(--font-geist-mono, monospace)">PMC</text>
            <text x="160" y="146" textAnchor="middle" fontSize="8" className="fill-zinc-500 font-semibold" fontFamily="var(--font-geist-mono, monospace)">PME</text>
          </svg>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-zinc-500">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Too cheap</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Good value</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />Getting expensive</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Too expensive</span>
          </div>
          <p className="mt-1.5 text-[0.65rem] text-zinc-400">
            <span className="inline-block h-2 w-2 rounded-full border border-zinc-500 bg-white align-[-1px]" /> PMC / PME - the price points where opinion flips, marking the acceptable range
          </p>
        </div>
      ),
    },
    {
      icon: ChartBar,
      title: "Your whole catalog, at a glance",
      body: "See every product's recommendation and estimated profit lift in one view. Apply them individually or all at once.",
      span: "md:col-span-2",
      visual: (
        <div className="mt-6 flex flex-1 flex-col overflow-hidden rounded-lg border border-zinc-100">
          <table className="h-full w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-3 py-3 text-left font-medium text-zinc-500">Product</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-500">Action</th>
                <th className="px-3 py-3 text-right font-medium text-zinc-500">Est. lift</th>
              </tr>
            </thead>
            <tbody>
              {catalogRows.map((row, i) => (
                <tr
                  key={row.sku}
                  className={`border-b border-zinc-100 last:border-0 ${i % 2 === 1 ? "bg-zinc-50/50" : ""}`}
                >
                  <td className="px-3 py-4">
                    <span className="font-medium text-zinc-700">{row.name}</span>
                    <span className="ml-2 font-mono text-zinc-500">{row.sku}</span>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${actionStyle[row.action]}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right font-mono font-medium text-zinc-700">
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
                className={`flex flex-col rounded-xl border border-zinc-200 bg-white p-7 ${f.span}`}
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
