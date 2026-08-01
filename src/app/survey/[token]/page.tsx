"use client";

import { use, useEffect, useState } from "react";
import { ProductThumbnail } from "@/components/ProductThumbnail";
import { dollarsToCents } from "@/lib/money";

interface SurveyInfo {
  productTitle: string;
  productImageUrl: string | null;
}

type FieldKey = "tooCheapCents" | "goodValueCents" | "gettingExpensiveCents" | "tooExpensiveCents";

const QUESTIONS: { key: FieldKey; label: string }[] = [
  { key: "tooCheapCents", label: "At what price would this be so cheap you'd doubt its quality?" },
  { key: "goodValueCents", label: "At what price would this be a bargain - great value for the money?" },
  { key: "gettingExpensiveCents", label: "At what price would this start to feel expensive, but you'd still consider buying it?" },
  { key: "tooExpensiveCents", label: "At what price would this be too expensive to consider buying?" },
];

type Status =
  | "loading"
  | "not-found"
  | "ready"
  | "submitting"
  | "done"
  | "already-responded"
  | "rate-limited"
  | "load-error"
  | "submit-error";

export default function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [status, setStatus] = useState<Status>("loading");
  const [survey, setSurvey] = useState<SurveyInfo | null>(null);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    tooCheapCents: "",
    goodValueCents: "",
    gettingExpensiveCents: "",
    tooExpensiveCents: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/survey/${token}`);
        if (cancelled) return;
        if (res.status === 404) {
          setStatus("not-found");
          return;
        }
        if (!res.ok) {
          setStatus("load-error");
          return;
        }
        const data = (await res.json()) as SurveyInfo;
        setSurvey(data);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("load-error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateValue(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const cents: Record<FieldKey, number | null> = {
      tooCheapCents: dollarsToCents(values.tooCheapCents),
      goodValueCents: dollarsToCents(values.goodValueCents),
      gettingExpensiveCents: dollarsToCents(values.gettingExpensiveCents),
      tooExpensiveCents: dollarsToCents(values.tooExpensiveCents),
    };

    for (const q of QUESTIONS) {
      const v = cents[q.key];
      if (v === null || v <= 0) {
        setErrorMessage("Please enter a valid price for every question.");
        return;
      }
    }

    const { tooCheapCents, tooExpensiveCents } = cents;
    if (tooCheapCents !== null && tooExpensiveCents !== null && tooCheapCents > tooExpensiveCents) {
      setErrorMessage("The 'too cheap' price can't be higher than the 'too expensive' price.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch(`/api/survey/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cents),
      });

      if (res.status === 200) {
        setStatus("done");
        return;
      }
      if (res.status === 409) {
        setStatus("already-responded");
        return;
      }
      if (res.status === 429) {
        setStatus("rate-limited");
        return;
      }
      if (res.status === 400) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error ?? "Please check your prices and try again.");
        setStatus("ready");
        return;
      }
      setStatus("submit-error");
    } catch {
      setStatus("submit-error");
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Loading survey...
        </p>
      </main>
    );
  }

  if (status === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Survey not found</h1>
          <p className="mt-2 text-sm text-muted">
            This survey link is invalid or no longer available.
          </p>
        </div>
      </main>
    );
  }

  if (status === "load-error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            We couldn't load this survey. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  if (status === "submit-error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            Something went wrong submitting your response. Please try again.
          </p>
        </div>
      </main>
    );
  }

  if (status === "already-responded") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">You've already responded</h1>
          <p className="mt-2 text-sm text-muted">
            Thanks - we've already recorded a response from this browser for this survey.
          </p>
        </div>
      </main>
    );
  }

  if (status === "rate-limited") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Too many attempts</h1>
          <p className="mt-2 text-sm text-muted">
            You've made too many attempts recently. Please wait a bit and try again.
          </p>
        </div>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Thank you!</h1>
          <p className="mt-2 text-sm text-muted">
            Your response has been recorded. We appreciate your feedback.
          </p>
        </div>
      </main>
    );
  }

  // status is "ready" or "submitting"
  const submitting = status === "submitting";

  return (
    <main className="flex min-h-screen justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ProductThumbnail imageUrl={survey?.productImageUrl ?? null} alt={survey?.productTitle ?? "Product"} size={48} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">Pricing survey</p>
              <h1 className="text-lg font-semibold text-ink">{survey?.productTitle}</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            We'd love to know how you think about this product's price. Please answer with a dollar amount for each question below.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {QUESTIONS.map((q) => (
              <div key={q.key}>
                <label htmlFor={q.key} className="block text-sm font-medium text-ink">
                  {q.label}
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-sm text-muted">$</span>
                  <input
                    id={q.key}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="field w-full"
                    value={values[q.key]}
                    onChange={(e) => updateValue(q.key, e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            ))}

            {errorMessage && (
              <p className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              <span role="status" aria-live="polite">
                {submitting ? "Submitting..." : "Submit"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
