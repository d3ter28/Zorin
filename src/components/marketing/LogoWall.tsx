"use client";

import { motion, useReducedMotion } from "motion/react";

export function LogoWall() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-zinc-100 bg-zinc-50/50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <p className="mb-8 text-center text-xs font-medium tracking-wide text-zinc-600 uppercase">
          Works with the platforms you already use
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { name: "Shopify", icon: "https://cdn.simpleicons.org/shopify/95BF47", glow: "#95BF47" },
              { name: "WooCommerce", icon: "/woocommerce-logo.jpg", glow: "#7F54B3" },
            ].map(({ name, icon, glow }, i) => (
              <motion.div
                key={name}
                className="group flex cursor-default items-center gap-3"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <img
                  src={icon}
                  alt={name}
                  width={24}
                  height={24}
                  className="h-6 w-6 opacity-90 transition-all duration-300 group-hover:opacity-100"
                  style={{ ["--glow" as string]: glow }}
                  onMouseEnter={e => (e.currentTarget.style.filter = `drop-shadow(0 0 10px ${glow})`)}
                  onMouseLeave={e => (e.currentTarget.style.filter = "")}
                />
                <span className="text-sm font-medium text-zinc-600 transition-colors duration-300 group-hover:text-zinc-900">
                  {name}
                </span>
              </motion.div>
            ))}
          </div>
          <motion.p
            className="text-xs text-zinc-600"
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            More integrations coming: BigCommerce, and others.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
