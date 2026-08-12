import { requireSessionPage } from "@/lib/auth/requireSession";
import { AppShell } from "@/components/AppShell";
import { CampaignDetail } from "@/components/CampaignDetail";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionPage();
  const { id } = await params;
  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <CampaignDetail campaignId={id} />
      </div>
    </AppShell>
  );
}
