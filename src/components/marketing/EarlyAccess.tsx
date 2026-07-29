"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type FormState = "idle" | "loading" | "success" | "error";

export function EarlyAccess() {
  const reduce = useReducedMotion();
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const body = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      storeUrl: (form.elements.namedItem("storeUrl") as HTMLInputElement).value.trim() || undefined,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim() || undefined,
    };

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <section id="early-access" className="scroll-mt-20 bg-zinc-50/50">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:py-16">
        <div className="grid gap-16 md:grid-cols-2 md:items-start">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Talk to us
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              Want a personal walkthrough?
            </h2>
            <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-zinc-500">
              You don&apos;t need to wait — every plan starts with an instant 7-day free trial, no credit card required. But if you&apos;d rather talk it through first, tell us about your store and we&apos;ll reach out personally.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                "No waitlist — sign up and start your trial right away",
                "Direct line to the founder for support",
                "Shape the features we build next",
                "Locked-in early adopter pricing when we launch",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <circle cx="8" cy="8" r="7" className="fill-blue-100" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {state === "success" ? (
              <div className="flex flex-col items-start gap-4 rounded-xl border border-blue-200 bg-blue-50 p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Thanks — we&apos;ll be in touch</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    In the meantime, you can{" "}
                    <a href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
                      start your free trial
                    </a>{" "}
                    whenever you&apos;re ready.
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ea-name" className="text-sm font-medium text-zinc-700">
                    Name
                  </label>
                  <input
                    id="ea-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Jane Smith"
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ea-email" className="text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <input
                    id="ea-email"
                    name="email"
                    type="email"
                    required
                    placeholder="jane@yourstore.com"
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ea-store" className="text-sm font-medium text-zinc-700">
                    Store URL <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="ea-store"
                    name="storeUrl"
                    type="url"
                    placeholder="https://yourstore.com"
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ea-message" className="text-sm font-medium text-zinc-700">
                    Anything you want us to know? <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <textarea
                    id="ea-message"
                    name="message"
                    rows={3}
                    placeholder="Your store size, biggest pricing headache, platform you use..."
                    className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {state === "error" && (
                  <p className="text-sm text-red-500">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {state === "loading" ? "Submitting…" : "Request a walkthrough"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
