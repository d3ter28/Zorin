"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<VanWestendorpResult | null>(null);

  function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    fetch(`/api/products/${productId}/surveys`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSurveys)
      .catch(() => setSurveys([]))
      .finally(() => setRefreshing(false));
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${productId}/surveys`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => active && setSurveys(data))
      .catch(() => active && setSurveys([]));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const survey = surveys && surveys.length > 0 ? surveys[0] : null;

  function loadResults() {
    if (!survey) return;
    fetch(`/api/products/${productId}/surveys/${survey.id}/results`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setResult)
      .catch(() => setResult(null));
  }

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

  function refresh() {
    load(true);
    loadResults();
  }

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
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-ink">Van Westendorp Analysis</h3>
        {survey && (
          <button
            onClick={refresh}
            disabled={refreshing}
            className="shrink-0 text-muted hover:text-ink transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {!survey ? (
        <>
          <p className="mt-0.5 mb-4 text-xs text-muted">
            Create a shareable link to ask customers about prices using a price sensitivity
            survey.
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
          <span className="sr-only" aria-live="polite">
            {copied ? "Copied to clipboard" : ""}
          </span>

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
