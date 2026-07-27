"use client";

import { motion, useReducedMotion } from "motion/react";
import { WarningCircle, Shuffle, Timer, ArrowRight } from "@phosphor-icons/react";

const problems = [
  {
    icon: WarningCircle,
    title: "Gut-feel pricing",
    body: "You pick a number that feels right and hope customers agree. But is $79 better than $89? You genuinely can't tell without data, and data takes time you don't have.",
  },
  {
    icon: Shuffle,
    title: "Copying competitors",
    body: "Your competitors sell to different customers in different markets. Matching their price assumes your buyers are identical to theirs. They're not, and you're leaving margin on the table.",
  },
  {
    icon: Timer,
    title: "Set it and forget it",
    body: "You updated your prices months ago and haven't touched them since. Meanwhile your costs shifted, your product mix changed, and the right price moved with it.",
  },
];

export function WhyZorin() {
  const reduce = useReducedMotion();

  return (
    <section className="scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">

        {/* Problem headline */}
        <motion.div
          className="max-w-2xl"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
            The pricing problem
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Most merchants are leaving money on every sale, with no way to know how much.
          </h2>
          <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
            Pricing feels like a guessing game because it is. Without a systematic way to read your own sales data, you're choosing numbers in the dark.
          </p>
        </motion.div>

        {/* Pain point cards */}
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {problems.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                className="rounded-xl border border-zinc-200 bg-white p-7"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-500">
                  <Icon size={20} weight="duotone" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{p.body}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Solution callout */}
        <motion.div
          className="mt-10 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="grid gap-8 p-8 md:grid-cols-2 md:gap-16 md:p-12">
            <div>
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                The Zorin solution
              </span>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
                Your sales data already holds the answer. You just can&apos;t read it yet.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                Every sale you&apos;ve ever made is a data point. When 100 customers bought at $49 but only 55 bought when you raised it to $59, that gap tells you exactly how price-sensitive your buyers are.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                Zorin reads thousands of those signals across your entire catalog, calculates the price that would make you the most profit for each product, and tells you whether to raise, lower, or hold. No spreadsheets. No data science degree. No guessing.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4">
              {[
                {
                  before: "\"I'll try $79 and see what happens.\"",
                  after: "\"My elasticity is –1.2. Raising to $85 lifts profit 14%.\"",
                },
                {
                  before: "\"My competitor charges $89 so I'll charge $89.\"",
                  after: "\"My customers are less price-sensitive. I can charge $97.\"",
                },
                {
                  before: "\"I haven't touched prices in six months.\"",
                  after: "\"Three products are under-priced. Zorin flagged them.\"",
                },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-white/70 p-4">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-zinc-400 line-through">
                      {row.before}
                    </p>
                    <div className="flex items-start gap-2">
                      <ArrowRight size={14} className="mt-0.5 shrink-0 text-blue-500" />
                      <p className="text-xs leading-relaxed font-medium text-zinc-700">
                        {row.after}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
