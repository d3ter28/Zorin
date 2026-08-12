import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { CampaignList } from "@/components/CampaignList";
import Link from "next/link";

export default async function CampaignsPage() {
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
            <h1 className="text-xl font-semibold text-ink">Campaigns</h1>
            <p className="text-sm text-muted mt-0.5">
              Manage pricing campaigns across your catalog.
            </p>
          </div>
          <Link href="/campaigns/new" className="btn btn-primary text-sm">
            + New Campaign
          </Link>
        </header>
        <CampaignList />
      </div>
    </AppShell>
  );
}
