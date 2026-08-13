"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";

interface CampaignPerf {
  campaignId: string;
  name: string;
  status: string;
  firstAppliedAt: string;
  windowEnd: string;
  days: number;
  productsChanged: number;
  duringProfitCents: number;
  priorProfitCents: number;
  deltaCents: number;
  noPriorBaseline: boolean;
  stillRunning: boolean;
  estimated: boolean;
}

function signedCents(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}${formatCents(Math.abs(cents))}`;
}

export function CampaignPerformanceList() {
  const [data, setData] = useState<CampaignPerf[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profit/campaigns")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: CampaignPerf[]) => { if (active) setData(d); })
      .catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, []);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">Campaign performance</h2>

      {data === null ? (
        <div className="h-32 animate-pulse rounded-lg bg-panel" />
      ) : data.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">No campaign performance yet. Run a campaign to see its impact.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-2 py-2 font-medium">Campaign</th>
                <th className="px-2 py-2 font-medium">Ran</th>
                <th className="px-2 py-2 font-medium">Products</th>
                <th className="px-2 py-2 font-medium">Profit (window)</th>
                <th className="px-2 py-2 font-medium">vs prior period</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.campaignId} className="border-b border-line last:border-0">
                  <td className="px-2 py-2">
                    <Link href={`/campaigns/${c.campaignId}`} className="text-ink hover:text-accent">{c.name}</Link>
                    {c.estimated && <span className="ml-1 text-xs text-faint" title="Estimated from current costs">est.</span>}
                    {c.stillRunning && <span className="block text-xs text-warning">still running — partial window</span>}
                  </td>
                  <td className="px-2 py-2 text-muted tabular-nums">{c.days}d</td>
                  <td className="px-2 py-2 text-muted tabular-nums">{c.productsChanged}</td>
                  <td className="px-2 py-2 text-ink tabular-nums">{formatCents(c.duringProfitCents)}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {c.noPriorBaseline ? (
                      <span className="text-faint">no prior baseline</span>
                    ) : (
                      <span className={c.deltaCents >= 0 ? "text-positive" : "text-danger"}>
                        {signedCents(c.deltaCents)} {c.deltaCents >= 0 ? "▲" : "▼"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-faint">&ldquo;vs prior period&rdquo; compares each campaign to the equal-length window before it started — a period comparison, not proven causation.</p>
        </div>
      )}
    </div>
  );
}
