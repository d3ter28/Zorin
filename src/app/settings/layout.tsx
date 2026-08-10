import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-muted mb-6">Manage your account, billing, team, and integrations.</p>
        {children}
      </main>
    </AppShell>
  );
}
