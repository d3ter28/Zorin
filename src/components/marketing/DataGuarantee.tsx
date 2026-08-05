"use client";

import { motion, useReducedMotion } from "motion/react";
import { Prohibit, ShieldCheck, TrashSimple } from "@phosphor-icons/react";

const guarantees = [
  {
    icon: Prohibit,
    title: "Zero data selling",
    body: "We never sell, monetize, or expose your store's sales figures, customer records, or margin data to third parties or competitors.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated elasticity models",
    body: "Your pricing model is built strictly on your own historical data. Your catalog insights are never leaked into other merchants' pricing engines.",
  },
  {
    icon: TrashSimple,
    title: "Data deletion on request",
    body: "If you close your account, email support@tryzorin.com and we'll permanently delete your uploaded sales history from our servers.",
  },
];

export function DataGuarantee() {
  const reduce = useReducedMotion();

  return (
    <section className="scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
        <motion.div
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 md:p-12"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
            How Zorin protects your sales data
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {guarantees.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.title}>
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">{g.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{g.body}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
