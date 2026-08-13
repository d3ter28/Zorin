import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { ProfitSummaryCards } from "@/components/ProfitSummaryCards";
import { ProfitTrendChart } from "@/components/ProfitTrendChart";

export default async function ProfitPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <div className="px-8 py-8 max-w-6xl space-y-8">
        <header>
          <h1 className="text-xl font-semibold text-ink">Profit</h1>
          <p className="text-sm text-muted mt-0.5">Real P&amp;L, per-product profit, and campaign performance.</p>
        </header>
        <ProfitSummaryCards />
        <ProfitTrendChart />
        {/* ProductProfitTable, CampaignPerformanceList added in later tasks */}
      </div>
    </AppShell>
  );
}
