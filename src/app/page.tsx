import { Dashboard } from "@/components/Dashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";

export default async function Home() {
  const { merchantId } = await requireSessionPage();
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">PriceIQ</h1>
          <p className="mt-1 text-sm text-muted">
            Competitor-aware pricing recommendations · {merchant?.name ?? "Your store"}
          </p>
        </div>
        <LogoutButton />
      </header>
      <Dashboard />
    </main>
  );
}
