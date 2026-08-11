"use client";
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { PLAN_CATALOG } from "@/lib/billing/planCatalog";
import { PLAN_TIERS, type PlanTier } from "@/lib/stripe/plans";

export function BillingCard({
  planTier,
  subscriptionStatus,
}: {
  planTier: string | null;
  subscriptionStatus: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusyTier, setCheckoutBusyTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      const data: { url?: unknown } = await res.json();
      if (typeof data.url !== "string" || data.url === "") {
        setError("Something went wrong");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  async function choosePlan(tier: PlanTier) {
    setCheckoutBusyTier(tier);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setCheckoutError(data.error ?? "Something went wrong");
        setCheckoutBusyTier(null);
        return;
      }
      const data: { url?: unknown } = await res.json();
      if (typeof data.url !== "string" || data.url === "") {
        setCheckoutError("Something went wrong");
        setCheckoutBusyTier(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Network error — please try again");
      setCheckoutBusyTier(null);
    }
  }

  const currentTierIndex = planTier ? PLAN_TIERS.indexOf(planTier as PlanTier) : -1;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Billing</h2>
        <p className="mt-2 text-sm text-muted">
          Plan: <span className="font-medium text-ink">{planTier ?? "None"}</span>
          {" · "}
          Status: <span className="font-medium text-ink">{subscriptionStatus ?? "Inactive"}</span>
        </p>
        <button onClick={openPortal} disabled={busy} className="btn mt-4">
          {busy ? "Loading…" : "Manage billing"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">Change plan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_CATALOG.map((plan) => {
            const planIndex = PLAN_TIERS.indexOf(plan.tier);
            const isCurrent = planTier === plan.tier;
            const label = currentTierIndex === -1 ? "Choose plan" : planIndex > currentTierIndex ? "Upgrade" : "Downgrade";
            return (
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

                {isCurrent ? (
                  <p className="mt-auto text-center text-sm font-semibold text-accent">Current plan</p>
                ) : (
                  <button
                    onClick={() => choosePlan(plan.tier)}
                    disabled={checkoutBusyTier !== null}
                    className={checkoutBusyTier === plan.tier || !plan.highlight ? "btn btn-ghost mt-auto" : "btn btn-primary mt-auto"}
                  >
                    {checkoutBusyTier === plan.tier ? "Redirecting…" : label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {checkoutError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {checkoutError}
          </p>
        )}
      </section>
    </div>
  );
}
