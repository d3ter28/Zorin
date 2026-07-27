"use client";
import { useState } from "react";

const PLANS = [
  { tier: "starter", name: "Starter", price: "$39/mo" },
  { tier: "growth", name: "Growth", price: "$99/mo" },
  { tier: "scale", name: "Scale", price: "$249/mo" },
] as const;

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
      const data: { url: string } = await res.json();
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setBusyTier(null);
    }
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {PLANS.map((p) => (
        <div key={p.tier} className="rounded-xl border border-line bg-surface p-5 text-center">
          <p className="text-sm font-semibold text-ink">{p.name}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{p.price}</p>
          <button
            onClick={() => choose(p.tier)}
            disabled={busyTier !== null}
            className="btn mt-4 w-full"
          >
            {busyTier === p.tier ? "Redirecting…" : "Choose plan"}
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
