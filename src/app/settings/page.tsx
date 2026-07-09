import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";

export default async function SettingsPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { name: true },
  });

  return (
    <AppShell merchantName={merchant?.name ?? undefined}>
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <ShopifyConnectionCard />
      </main>
    </AppShell>
  );
}
