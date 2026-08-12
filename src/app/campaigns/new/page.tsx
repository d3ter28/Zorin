import { requireSessionPage } from "@/lib/auth/requireSession";
import { AppShell } from "@/components/AppShell";
import { CampaignBuilder } from "@/components/CampaignBuilder";

export default async function NewCampaignPage() {
  await requireSessionPage();
  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <h1 className="text-xl font-semibold text-ink mb-8">New Campaign</h1>
        <CampaignBuilder />
      </div>
    </AppShell>
  );
}
