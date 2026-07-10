"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Plus, Minus } from "@phosphor-icons/react";

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need a developer or data scientist to use this?",
    a: "No. You upload a CSV of your past sales, the same spreadsheet you already export from Shopify or your order system. Zorin does everything else. No code, no configuration, no technical background required.",
  },
  {
    q: "How much sales data do I need before it works?",
    a: "Around 50–100 sales records per product gives reliable results. If you have less than that for a product, Zorin will tell you the model is weak and flag it. You'll never get a confident-sounding recommendation from thin data.",
  },
  {
    q: "What's the difference between this and just checking what my competitors charge?",
    a: "Competitor prices tell you what works for their customers in their market. Your customers (their price sensitivity, their income bracket, the reason they found you) are different. Zorin learns from how your buyers actually respond to price, not someone else's.",
  },
  {
    q: "Will it work if my sales are seasonal?",
    a: "Yes. Zorin builds a model from the data you give it, so if you upload a full year of history, it learns patterns across seasons. For highly seasonal products, we recommend uploading data from the relevant period when you want a recommendation.",
  },
  {
    q: "What happens to my sales data?",
    a: "Your data is stored in your account only and is never shared, sold, or used to train models for other merchants. Each merchant's data is fully isolated.",
  },
  {
    q: "What if I disagree with a recommendation?",
    a: "You always apply prices manually. Nothing changes automatically. Every recommendation comes with a confidence score and the underlying model stats, so you can judge whether to act on it or not.",
  },
  {
    q: "Why not just ask ChatGPT or Claude to analyze my pricing?",
    a: (
      <div className="flex flex-col gap-3">
        <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Their advice is generic.</span> LLMs can&apos;t see your sales data. They give pricing opinions based on general knowledge, not recommendations built from your actual demand curve.</p>
        <p><span className="font-medium text-zinc-700 dark:text-zinc-300">The numbers are made up.</span> If you paste in a spreadsheet and ask for an elasticity number, they&apos;ll give you one confidently. It will be fabricated. Zorin fits a real statistical model to your data and shows you an R² score so you know exactly how much to trust it.</p>
        <p><span className="font-medium text-zinc-700 dark:text-zinc-300">The answer changes every time.</span> Ask an LLM the same question twice and you get two different answers. Zorin is deterministic: same data, same result, every time.</p>
        <p><span className="font-medium text-zinc-700 dark:text-zinc-300">They miss promotional spikes.</span> If you ran a sale last November, an LLM won&apos;t know to exclude those orders from the model. Zorin detects them automatically so they don&apos;t skew your recommendations.</p>
        <p><span className="font-medium text-zinc-700 dark:text-zinc-300">The workflow doesn&apos;t scale.</span> You&apos;d need to export your data, paste it in, engineer a prompt, interpret the output, and repeat for every product every time. Zorin does it in one place for your whole catalog.</p>
      </div>
    ),
  },
  {
    q: "Is it free right now?",
    a: "Yes. Zorin is free for all early access users while we're in MVP. In exchange, we ask for honest feedback on what's working and what isn't. Early access users get locked-in pricing when we launch paid plans.",
  },
];

function FAQItem({ q, a, index }: { q: string; a: React.ReactNode; index: number }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="border-b border-zinc-200 last:border-0 dark:border-zinc-800"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{q}</span>
        <span className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">
          {open ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  return (
    <section className="scroll-mt-20 bg-zinc-50/50 dark:bg-zinc-900/30">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-24">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
              Common questions
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Still not sure? These are what merchants usually ask before signing up.
            </p>
            <a
              href="/#early-access"
              className="mt-8 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              Request early access
            </a>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {faqs.map((faq, i) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
