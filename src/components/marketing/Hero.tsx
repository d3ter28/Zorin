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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            7-day free trial - no credit card required
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Stop guessing your prices.{" "}
            <span className="text-blue-600">Start optimizing.</span>
          </h1>
          <p className="mt-5 max-w-[50ch] text-lg leading-relaxed text-zinc-500">
            Zorin turns your sales history into profit-maximizing price recommendations, no spreadsheets required.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              Start free trial
            </a>
            <a
              href="/login"
              className="inline-flex h-11 items-center rounded-lg border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98]"
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
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
              <span className="ml-3 text-xs text-zinc-500">Zorin Dashboard</span>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-700">Premium Wireless Headphones</span>
                <span className="font-mono text-xs text-zinc-500">SKU-4821</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Current</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-zinc-800">$79.99</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-600">Recommended</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-blue-700">$89.99</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Profit lift</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-blue-600">+18.3%</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
                  <div className="h-1.5 w-[82%] rounded-full bg-blue-500" />
                </div>
                <span className="font-mono text-xs text-zinc-500">82% confidence</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
