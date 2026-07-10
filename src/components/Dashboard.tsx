"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PortfolioStats } from "./PortfolioStats";
import { ProductsTable } from "./ProductsTable";
import { ProductUpload } from "./ProductUpload";
import { SalesHistoryUpload } from "./SalesHistoryUpload";
import { formatCents } from "@/lib/money";
import { PortfolioTrendChart } from "./PortfolioTrendChart";
import { OnboardingChecklist } from "./OnboardingChecklist";

type Tab = "overview" | "products";

interface OpportunityRow {
  id: string;
  title: string;
  sku: string;
  recommendedAction: "raise" | "lower" | "hold" | null;
  suggestedPrice: number | null;
  currentPrice: number;
}

function TopOpportunities({ rows }: { rows: OpportunityRow[] }) {
  const actionable = rows
    .filter((r) => r.recommendedAction === "raise" || r.recommendedAction === "lower")
    .sort((a, b) => {
      if (a.recommendedAction !== b.recommendedAction) {
        return a.recommendedAction === "raise" ? -1 : 1;
      }
      const deltaA = Math.abs((a.suggestedPrice ?? a.currentPrice) - a.currentPrice);
      const deltaB = Math.abs((b.suggestedPrice ?? b.currentPrice) - b.currentPrice);
      return deltaB - deltaA;
    })
    .slice(0, 8);

  if (!actionable.length) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 flex items-center justify-center h-40">
        <p className="text-sm text-muted">No actionable recommendations yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-sm font-semibold text-ink">Top Opportunities</h2>
        <p className="text-xs text-muted mt-0.5">Products with active recommendations</p>
      </div>
      <div className="divide-y divide-line">
        {actionable.map((r, i) => (
          <Link
            key={r.id}
            href={`/product/${r.id}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-panel transition-colors"
          >
            <span className="text-xs tabular-nums text-faint w-4">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">{r.title}</p>
              <p className="text-xs text-faint">{r.sku}</p>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  r.recommendedAction === "raise" ? "text-positive" : "text-warning"
                }`}
              >
                {r.recommendedAction}
              </span>
              {r.suggestedPrice !== null && (
                <p className="text-xs text-muted">{formatCents(r.suggestedPrice)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface PortfolioData {
  totalProducts: number;
  hasModels: boolean;
  hasAppliedPrice: boolean;
}

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshToken, setRefreshToken] = useState(0);
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [showChecklist, setShowChecklist] = useState(() => {
    try {
      return sessionStorage.getItem("zorin_checklist_dismissed") !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: OpportunityRow[]) => setRows(data))
      .catch(() => {});
  }, [refreshToken]);

  useEffect(() => {
    fetch("/api/products/portfolio")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PortfolioData | null) => setPortfolio(data))
      .catch(() => setPortfolio(null));
  }, [refreshToken]);

  function refresh() {
    setRefreshToken((t) => t + 1);
  }

  const hasProducts = (portfolio?.totalProducts ?? 0) > 0;
  const hasModels = portfolio?.hasModels ?? false;
  const hasAppliedPrice = portfolio?.hasAppliedPrice ?? false;
  const allDone = hasProducts && hasModels && hasAppliedPrice;

  const firstProductWithoutModel = rows[0]?.id;

  const firstProductWithRecommendation = rows.find(
    (r) => r.recommendedAction === "raise" || r.recommendedAction === "lower"
  )?.id;

  return (
    <div>
      {portfolio && !allDone && showChecklist && (
        <OnboardingChecklist
          hasProducts={hasProducts}
          hasModels={hasModels}
          hasAppliedPrice={hasAppliedPrice}
          onDismiss={() => {
            try { sessionStorage.setItem("zorin_checklist_dismissed", "true"); } catch {}
            setShowChecklist(false);
          }}
          onGoToProducts={() => setTab("products")}
          firstProductWithoutModel={firstProductWithoutModel}
          firstProductWithRecommendation={firstProductWithRecommendation}
        />
      )}
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-line mb-8">
        {(["overview", "products"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "overview" ? "Overview" : "Products"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <PortfolioStats refreshToken={refreshToken} onGoToProducts={() => setTab("products")} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PortfolioTrendChart />
            <TopOpportunities rows={rows} />
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-6">
          <ProductUpload onImported={refresh} />
          <SalesHistoryUpload autoML onSuccess={refresh} />
          <ProductsTable refreshToken={refreshToken} />
        </div>
      )}
    </div>
  );
}
