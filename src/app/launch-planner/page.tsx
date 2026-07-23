import { AppShell } from "@/components/AppShell";
import { LaunchPlanner } from "@/components/LaunchPlanner";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";

export default async function LaunchPlannerPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <div className="px-8 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-ink">Launch Planner</h1>
          <p className="text-sm text-muted mt-0.5">{merchant?.name ?? "Your store"}</p>
        </header>
        <LaunchPlanner />
      </div>
    </AppShell>
  );
}
