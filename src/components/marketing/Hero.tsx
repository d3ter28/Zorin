"use client";

import { motion, useReducedMotion } from "motion/react";

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-16">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:gap-16 md:py-20 lg:py-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Early Access, free while in MVP
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl dark:text-zinc-50">
            Stop guessing your prices.{" "}
            <span className="text-blue-600 dark:text-blue-400">Start optimizing.</span>
          </h1>
          <p className="mt-5 max-w-[50ch] text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Zorin turns your sales history into profit-maximizing price recommendations, no spreadsheets required.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#early-access"
              className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              Request early access
            </a>
            <a
              href="/login"
              className="inline-flex h-11 items-center rounded-lg border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            >
              Already have access? Log in
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <span className="ml-3 text-xs text-zinc-400 dark:text-zinc-500">Zorin Dashboard</span>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Premium Wireless Headphones</span>
                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">SKU-4821</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Current</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-zinc-800 dark:text-zinc-200">$79.99</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/40">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Recommended</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-blue-700 dark:text-blue-300">$89.99</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Profit lift</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-blue-600 dark:text-blue-400">+18.3%</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-1.5 w-[82%] rounded-full bg-blue-500" />
                </div>
                <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">82% confidence</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
