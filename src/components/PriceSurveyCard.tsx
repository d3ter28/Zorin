"use client";

import { useEffect, useState } from "react";
import { PriceSensitivityChart } from "@/components/PriceSensitivityChart";
import type { VanWestendorpResult } from "@/lib/priceSurvey/vanWestendorp";

interface SurveySummary {
  id: string;
  shareUrl: string;
  createdAt: string;
  responseCount: number;
}

const MIN_RESPONSES_FOR_CHART = 5;

export function PriceSurveyCard({ productId }: { productId: string }) {
  const [surveys, setSurveys] = useState<SurveySummary[] | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<VanWestendorpResult | null>(null);

  function load() {
    fetch(`/api/products/${productId}/surveys`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSurveys)
      .catch(() => setSurveys([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const survey = surveys && surveys.length > 0 ? surveys[0] : null;

  useEffect(() => {
    if (!survey || survey.responseCount < MIN_RESPONSES_FOR_CHART) {
      setResult(null);
      return;
    }
    let active = true;
    fetch(`/api/products/${productId}/surveys/${survey.id}/results`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => active && setResult(data))
      .catch(() => active && setResult(null));
    return () => {
      active = false;
    };
  }, [productId, survey?.id, survey?.responseCount]);

  async function createSurvey() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/surveys`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Could not create survey" }));
        throw new Error(body.error ?? "Could not create survey");
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create survey");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!survey) return;
    try {
      await navigator.clipboard.writeText(survey.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  if (surveys === undefined) {
    return <div className="h-24 animate-pulse rounded-xl border border-line bg-panel" />;
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">Price sensitivity survey</h3>

      {!survey ? (
        <>
          <p className="mt-0.5 mb-4 text-xs text-muted">
            Create a shareable link to ask customers about price sensitivity using the Van
            Westendorp method.
          </p>
          <button
            className="btn btn-ghost text-xs"
            disabled={creating}
            onClick={createSurvey}
          >
            {creating ? "Creating…" : "Create survey link"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-0.5 mb-4 text-xs text-muted">
            {survey.responseCount} response{survey.responseCount === 1 ? "" : "s"} so far.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={survey.shareUrl}
              className="field w-full text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button className="btn btn-ghost shrink-0 text-xs" onClick={copyLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-4">
            {survey.responseCount < MIN_RESPONSES_FOR_CHART ? (
              <p className="text-xs text-muted" role="status">
                {survey.responseCount} response{survey.responseCount === 1 ? "" : "s"} so far —
                need at least {MIN_RESPONSES_FOR_CHART} to see the chart.
              </p>
            ) : result ? (
              <PriceSensitivityChart result={result} />
            ) : (
              <p className="text-xs text-muted" role="status">
                Loading results…
              </p>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
