"use client";

import { motion, useReducedMotion } from "motion/react";

export function LogoWall() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <p className="mb-8 text-center text-xs font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          Works with the platforms you already use
        </p>
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="group flex cursor-default items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src="https://cdn.simpleicons.org/shopify/95BF47"
              alt="Shopify"
              width={24}
              height={24}
              className="h-6 w-6 grayscale opacity-50 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-hover:[filter:drop-shadow(0_0_10px_#95BF47)]"
            />
            <span className="text-sm font-medium text-zinc-400 transition-colors duration-300 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300">
              Shopify
            </span>
          </motion.div>
          <motion.p
            className="text-xs text-zinc-400 dark:text-zinc-500"
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            More integrations coming: WooCommerce, BigCommerce, and others.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
