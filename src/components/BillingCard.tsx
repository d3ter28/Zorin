"use client";
import { useState } from "react";

export function BillingCard({
  planTier,
  subscriptionStatus,
}: {
  planTier: string | null;
  subscriptionStatus: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
  );
}
