"use client";

import { motion, useReducedMotion } from "motion/react";

const stats = [
  { value: "18%", label: "avg profit lift from first optimization" },
  { value: "5 min", label: "from CSV upload to first recommendation" },
  { value: "Zero", label: "integrations needed to get started" },
  { value: "100%", label: "powered by your own sales data" },
];

export function MetricsStrip() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-zinc-100 dark:border-zinc-800/60">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="flex flex-col gap-1"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{
                duration: 0.45,
                delay: i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <dt className="font-mono text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {s.value}
              </dt>
              <dd className="text-sm leading-snug text-zinc-500 dark:text-zinc-400">
                {s.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
