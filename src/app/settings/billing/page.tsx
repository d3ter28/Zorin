import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { BillingCard } from "@/components/BillingCard";

export default async function BillingSettingsPage() {
  const user = await requireSessionPage();
  const merchant = await prisma.merchant.findFirst({
    where: { id: user.merchantId },
    select: { planTier: true, subscriptionStatus: true },
  });

  return (
    <BillingCard
      planTier={merchant?.planTier ?? null}
      subscriptionStatus={merchant?.subscriptionStatus ?? null}
    />
  );
}
