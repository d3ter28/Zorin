"use client";

import { motion, useReducedMotion } from "motion/react";
import { UploadSimple, ChartLine, TrendUp } from "@phosphor-icons/react";

const steps = [
  {
    icon: UploadSimple,
    title: "Upload your sales data",
    body: "Drop a CSV of past transactions. Zorin parses quantities, prices, and dates automatically.",
  },
  {
    icon: ChartLine,
    title: "We fit a demand model",
    body: "A log-log elasticity model learns how your customers respond to price changes for each product.",
  },
  {
    icon: TrendUp,
    title: "Get profit recommendations",
    body: "See the price that maximizes profit, the expected lift, and a confidence score you can trust.",
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Three steps to better prices
        </h2>
        <p className="mt-3 max-w-[50ch] text-base leading-relaxed text-zinc-500">
          No integrations to configure, no code to write. Just your sales history and five minutes.
        </p>

        <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="flex flex-col gap-4 bg-white p-8"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon size={22} weight="duotone" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {step.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
