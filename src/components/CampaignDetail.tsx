"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

type CampaignStatus =
  | "draft"
  | "scheduled"
  | "executing"
  | "active"
  | "reverting"
  | "completed";
type CampaignType = "sale" | "ml_recommendation";

interface CampaignProduct {
  id: string;
  productId: string;
  originalPriceCents: number;
  targetPriceCents: number;
  appliedAt: string | null;
  revertedAt: string | null;
  error: string | null;
  product: { title: string; sku: string };
}

interface CampaignLog {
  id: string;
  event: string;
  detail: string | null;
  createdAt: string;
}

interface Campaign {
  id: string;
  merchantId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  rules: string;
  revertOnEnd: boolean;
  startsAt: string | null;
  endsAt: string | null;
  executedAt: string | null;
  revertedAt: string | null;
  createdAt: string;
  products: CampaignProduct[];
  logs: CampaignLog[];
}

export interface CampaignDetailProps {
  campaignId: string;
}

function statusBadgeClass(status: CampaignStatus): string {
  switch (status) {
    case "draft":
      return "text-muted";
    case "scheduled":
      return "text-accent";
    case "executing":
      return "text-accent";
    case "active":
      return "text-positive";
    case "reverting":
      return "text-warning";
    case "completed":
      return "text-faint";
  }
}

function typeLabel(type: CampaignType): string {
  return type === "sale" ? "Sale" : "ML Recommendation";
}

function humanizeEvent(event: string): string {
  return event
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeAvgChange(products: CampaignProduct[]): string {
  const valid = products.filter(
    (p) => p.originalPriceCents > 0 && p.targetPriceCents != null,
  );
  if (valid.length === 0) return "—";
  const sum = valid.reduce(
    (acc, p) =>
      acc +
      ((p.targetPriceCents - p.originalPriceCents) / p.originalPriceCents) *
        100,
    0,
  );
  const avg = sum / valid.length;
  return `${avg >= 0 ? "+" : ""}${avg.toFixed(1)}%`;
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        if (!res.ok) throw new Error("load failed");
        const data: Campaign = await res.json();
        if (active) {
          setCampaign(data);
          setLoadError(false);
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [campaignId]);

  async function doAction(
    method: string,
    path: string,
    onSuccess?: () => void,
  ) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(path, { method });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `${method} failed`,
        );
      }
      if (onSuccess) {
        onSuccess();
      } else {
        // Reload campaign
        const updated = await fetch(`/api/campaigns/${campaignId}`);
        if (updated.ok) setCampaign(await updated.json());
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-xl bg-panel" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-panel" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-danger">
          Couldn&apos;t load this campaign.
        </p>
      </div>
    );
  }

  const { status } = campaign;
  const applied = campaign.products.filter((p) => p.appliedAt !== null).length;
  const errors = campaign.products.filter((p) => p.error !== null).length;
  const total = campaign.products.length;
  const avgChange = computeAvgChange(campaign.products);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
            >
              {status}
            </span>
            <span className="text-xs text-faint" aria-hidden>
              ·
            </span>
            <span className="text-xs text-faint">{typeLabel(campaign.type)}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-ink">
            {campaign.name}
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Draft: Edit + Delete */}
          {status === "draft" && (
            <>
              <Link
                href={`/campaigns/${campaignId}/edit`}
                className="btn btn-ghost text-sm"
              >
                Edit
              </Link>
              <button
                className="btn btn-danger text-sm"
                disabled={busy}
                onClick={() =>
                  doAction(
                    "DELETE",
                    `/api/campaigns/${campaignId}`,
                    () => {
                      window.location.href = "/campaigns";
                    },
                  )
                }
              >
                Delete
              </button>
            </>
          )}

          {/* Scheduled: Execute Now + Cancel */}
          {status === "scheduled" && (
            <>
              <button
                className="btn btn-primary text-sm"
                disabled={busy}
                onClick={() =>
                  doAction("POST", `/api/campaigns/${campaignId}/execute`)
                }
              >
                Execute Now
              </button>
              <button
                className="btn btn-ghost text-sm"
                disabled={busy}
                onClick={() =>
                  doAction("POST", `/api/campaigns/${campaignId}/cancel`)
                }
              >
                Cancel
              </button>
            </>
          )}

          {/* Active or Executing or Reverting: Stop Campaign */}
          {(status === "active" ||
            status === "executing" ||
            status === "reverting") && (
            <button
              className="btn btn-danger text-sm"
              disabled={busy}
              onClick={() =>
                doAction("POST", `/api/campaigns/${campaignId}/stop`)
              }
            >
              Stop Campaign
            </button>
          )}

          {/* Completed: Duplicate */}
          {status === "completed" && (
            <button
              className="btn btn-ghost text-sm"
              disabled={busy}
              onClick={() =>
                doAction("POST", `/api/campaigns/${campaignId}/duplicate`)
              }
            >
              Duplicate
            </button>
          )}

          {/* All statuses: Export CSV */}
          <a
            href={`/api/campaigns/${campaignId}/export`}
            download
            className="btn btn-ghost text-sm"
          >
            Export CSV
          </a>
        </div>
      </header>

      {actionError && (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Applied / Total" value={`${applied} / ${total}`} />
        <SummaryCard label="Avg Change" value={avgChange} />
        <SummaryCard label="Errors" value={errors} />
        <SummaryCard label="Status" value={status} />
      </div>

      {/* Timeline */}
      {campaign.logs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Timeline</h2>
          <ol className="space-y-3">
            {campaign.logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-panel border border-line" />
                <div>
                  <p className="text-sm text-ink">{humanizeEvent(log.event)}</p>
                  {log.detail && (
                    <p className="text-xs text-muted">{log.detail}</p>
                  )}
                  <p className="text-xs text-faint">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Product table */}
      {campaign.products.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Products</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Original</th>
                  <th className="px-4 py-2 font-medium">Target</th>
                  <th className="px-4 py-2 font-medium">Change</th>
                  <th className="px-4 py-2 font-medium">Applied</th>
                  <th className="px-4 py-2 font-medium">Reverted</th>
                  <th className="px-4 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {campaign.products.map((p) => {
                  const changePct =
                    p.originalPriceCents > 0
                      ? (
                          ((p.targetPriceCents - p.originalPriceCents) /
                            p.originalPriceCents) *
                          100
                        ).toFixed(1) + "%"
                      : "—";
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-4 py-2 text-ink">
                        {p.product.title}
                      </td>
                      <td className="px-4 py-2 text-muted">{p.product.sku}</td>
                      <td className="px-4 py-2 text-ink tabular-nums">
                        {formatCents(p.originalPriceCents)}
                      </td>
                      <td className="px-4 py-2 text-ink tabular-nums">
                        {formatCents(p.targetPriceCents)}
                      </td>
                      <td className="px-4 py-2 text-muted">{changePct}</td>
                      <td className="px-4 py-2 text-muted">
                        {p.appliedAt ? formatDate(p.appliedAt) : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {p.revertedAt ? formatDate(p.revertedAt) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {p.error ? (
                          <span className="text-danger">{p.error}</span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
