"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type CampaignStatus =
  | "draft"
  | "scheduled"
  | "executing"
  | "active"
  | "reverting"
  | "completed";
type CampaignType = "sale" | "ml_recommendation";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  _count: { products: number };
}

type TabId = "all" | "active" | "scheduled" | "completed" | "draft";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "draft", label: "Draft" },
];

function matchesTab(campaign: Campaign, tab: TabId): boolean {
  if (tab === "all") return true;
  if (tab === "active") {
    return campaign.status === "active" || campaign.status === "executing";
  }
  return campaign.status === tab;
}

function tabCount(campaigns: Campaign[], tab: TabId): number {
  return campaigns.filter((c) => matchesTab(c, tab)).length;
}

function typeLabel(type: CampaignType): string {
  return type === "sale" ? "Sale" : "ML Recommendation";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/campaigns");
        if (!res.ok) throw new Error("load failed");
        const data: Campaign[] = await res.json();
        setCampaigns(data);
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-panel" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-danger">Couldn&apos;t load campaigns.</p>
      </div>
    );
  }

  const filtered = campaigns.filter((c) => matchesTab(c, activeTab));

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((tab) => {
          const count = tabCount(campaigns, tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={isActive}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${isActive ? "text-accent" : "text-faint"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="text-sm font-semibold text-ink">No campaigns yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first campaign to start applying pricing rules.
          </p>
        </div>
      )}

      {/* Campaign cards */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}`}
            className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-panel"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(c.status)}`}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs text-faint" aria-hidden>
                    ·
                  </span>
                  <span className="text-xs text-faint">{typeLabel(c.type)}</span>
                </div>
                <p className="mt-1 font-medium text-ink">{c.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {c._count.products} product{c._count.products !== 1 ? "s" : ""}
                  {(c.startsAt || c.endsAt) && (
                    <>
                      {" · "}
                      {c.startsAt ? formatDate(c.startsAt) : "—"}
                      {" → "}
                      {c.endsAt ? formatDate(c.endsAt) : "ongoing"}
                    </>
                  )}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
