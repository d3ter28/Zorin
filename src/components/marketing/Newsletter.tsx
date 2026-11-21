"use client";

import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function Newsletter({ id = "newsletter" }: { id?: string }) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const website = (form.elements.namedItem("website") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <section id={id} className="scroll-mt-20 bg-zinc-50/50">
      <div className="mx-auto max-w-[1400px] px-6 py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Get new pricing articles by email
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            Practical pricing guides for online sellers, with the math worked out. No spam, unsubscribe anytime.
          </p>

          {state === "success" ? (
            <p className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm font-medium text-blue-700">
              You&apos;re on the list. Thanks for subscribing.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <label htmlFor={`${id}-email`} className="sr-only">
                Email address
              </label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                required
                placeholder="you@yourstore.com"
                className="h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
              >
                {state === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}

          {state === "error" && <p className="mt-3 text-sm text-red-500">{errorMsg}</p>}
        </div>
      </div>
    </section>
  );
}
