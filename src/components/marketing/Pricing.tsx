"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check } from "@phosphor-icons/react";

const plans = [
  {
    name: "Starter",
    price: "$39",
    period: "/mo",
    description: "For stores testing the waters with data-driven pricing.",
    cta: "Start free trial",
    href: "/signup?plan=starter",
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
    price: "$99",
    period: "/mo",
    description: "For growing stores ready to optimize their full catalog.",
    cta: "Start free trial",
    href: "/signup?plan=growth",
    highlight: true,
    features: [
      "Up to 150 products",
      "Shopify & WooCommerce sync",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    price: "$249",
    period: "/mo",
    description: "For catalogs and multi-store operations that outgrow the basics.",
    cta: "Talk to us",
    href: "/signup?plan=scale",
    highlight: false,
    features: [
      "Unlimited products",
      "Shopify & WooCommerce sync",
      "Elasticity modeling",
      "Profit recommendations",
      "What-if simulator",
      "Multi-store support",
      "Dedicated support",
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
          Start with a free trial. Upgrade as your catalog grows.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-7 ${
                plan.highlight
                  ? "border-blue-300 bg-white shadow-lg shadow-blue-600/5 dark:border-blue-700 dark:bg-zinc-950 dark:shadow-blue-400/5"
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
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
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

              <ul className="mt-6 mb-6 flex flex-1 flex-col justify-center gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-blue-500 dark:text-blue-400"
                    />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`mt-auto inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
                  plan.highlight
                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
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
