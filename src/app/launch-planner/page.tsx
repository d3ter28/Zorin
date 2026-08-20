import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { LaunchPlanner } from "@/components/LaunchPlanner";
import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Launch Planner — Zorin",
  description: "Plan and track a new product launch pricing strategy in Zorin.",
  robots: { index: false, follow: false },
};

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
        <Suspense fallback={null}>
          <LaunchPlanner />
        </Suspense>
      </div>
    </AppShell>
  );
}
