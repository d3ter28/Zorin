"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check } from "@phosphor-icons/react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For stores testing the waters with data-driven pricing.",
    cta: "Get started free",
    href: "/signup",
    highlight: false,
    features: [
      "Up to 25 products",
      "CSV upload",
      "Elasticity modeling",
      "Profit recommendations",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    period: "/mo",
    description: "For growing stores ready to optimize their full catalog.",
    cta: "Get started free",
    href: "/signup",
    highlight: true,
    features: [
      "Unlimited products",
      "CSV upload",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Priority support",
    ],
  },
];

export function Pricing() {
  const reduce = useReducedMotion();

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:py-32">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
          Simple, honest pricing
        </h2>
        <p className="mt-3 max-w-[45ch] text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Start free. Upgrade when your catalog outgrows the starter plan.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-2 md:max-w-3xl">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-7 ${
                plan.highlight
                  ? "border-emerald-300 bg-white shadow-lg shadow-emerald-600/5 dark:border-emerald-700 dark:bg-zinc-950 dark:shadow-emerald-400/5"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {plan.description}
              </p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400"
                    />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`mt-8 inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
                  plan.highlight
                    ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    : "border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
