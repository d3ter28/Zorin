import { requireSessionPage } from "@/lib/auth/requireSession";
import { AppShell } from "@/components/AppShell";
import { CampaignBuilder } from "@/components/CampaignBuilder";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionPage();
  const { id } = await params;
  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <h1 className="text-xl font-semibold text-ink mb-8">Edit Campaign</h1>
        <CampaignBuilder campaignId={id} />
      </div>
    </AppShell>
  );
}
