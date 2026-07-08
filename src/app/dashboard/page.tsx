import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";

export default async function DashboardPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <div className="px-8 py-8 max-w-6xl">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
            <p className="text-sm text-muted mt-0.5">{merchant?.name ?? "Your store"}</p>
          </div>
          <a
            href="/api/products/export"
            download="priceiq-products.csv"
            className="btn btn-ghost text-sm flex items-center gap-1.5"
          >
            ↓ Export CSV
          </a>
        </header>
        <Dashboard />
      </div>
    </AppShell>
  );
}
