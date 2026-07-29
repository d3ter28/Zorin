"use client";
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { PLAN_CATALOG } from "@/lib/billing/planCatalog";

export function ReactivatePlanPicker() {
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(tier: string) {
    setBusyTier(tier);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusyTier(null);
        return;
      }
      const data: { url?: unknown } = await res.json();
      if (typeof data.url !== "string" || data.url === "") {
        setError("Something went wrong");
        setBusyTier(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setBusyTier(null);
    }
  }

  return (
    <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
      {PLAN_CATALOG.map((plan) => (
        <div
          key={plan.tier}
          className={`relative flex flex-col rounded-xl border p-5 ${
            plan.highlight ? "border-accent bg-surface shadow-sm" : "border-line bg-surface"
          }`}
        >
          {plan.highlight && (
            <span className="absolute -top-3 left-5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-fg">
              Most popular
            </span>
          )}
          <p className="text-sm font-semibold text-ink">{plan.name}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-ink">{plan.price}</span>
            <span className="text-sm text-muted">{plan.period}</span>
          </div>
          <p className="mt-2 text-sm text-muted">{plan.description}</p>

          <ul className="mt-4 mb-5 flex flex-1 flex-col gap-2">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted">
                <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => choose(plan.tier)}
            disabled={busyTier !== null}
            className={busyTier === plan.tier || !plan.highlight ? "btn btn-ghost mt-auto" : "btn btn-primary mt-auto"}
          >
            {busyTier === plan.tier ? "Redirecting…" : "Choose plan"}
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="col-span-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
