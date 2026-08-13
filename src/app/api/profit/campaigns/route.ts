import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { windowProfitForProducts, type CogsChangeRow, type SalesRow } from "@/lib/profit/computeProfit";

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();
  const now = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: { merchantId },
    select: {
      id: true, name: true, status: true, endsAt: true, revertedAt: true,
      products: { where: { appliedAt: { not: null } }, select: { productId: true, appliedAt: true } },
    },
  });

  const active = campaigns.filter((c) => c.products.length > 0);
  if (active.length === 0) return NextResponse.json([]);

  const allProductIds = [...new Set(active.flatMap((c) => c.products.map((p) => p.productId)))];
  const [sales, products, cogsChanges] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { merchantId, productId: { in: allProductIds } },
      select: { productId: true, date: true, unitsSold: true, priceCents: true },
    }),
    prisma.product.findMany({ where: { id: { in: allProductIds } }, select: { id: true, cogs: true } }),
    prisma.cogsChange.findMany({
      where: { productId: { in: allProductIds } },
      select: { productId: true, toCents: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const currentCogs = new Map<string, number | null>(products.map((p) => [p.id, p.cogs]));
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  for (const c of cogsChanges) {
    const list = changesByProduct.get(c.productId) ?? [];
    list.push({ toCents: c.toCents, changedAt: c.changedAt });
    changesByProduct.set(c.productId, list);
  }
  const salesRows: SalesRow[] = sales.map((s) => ({
    productId: s.productId, date: s.date, unitsSold: s.unitsSold, priceCents: s.priceCents,
  }));

  const report = active.map((c) => {
    const appliedTimes = c.products.map((p) => p.appliedAt!.getTime());
    const firstAppliedAt = new Date(Math.min(...appliedTimes));
    const windowEnd = c.revertedAt ?? c.endsAt ?? now;
    const durationMs = Math.max(0, windowEnd.getTime() - firstAppliedAt.getTime());
    const priorStart = new Date(firstAppliedAt.getTime() - durationMs);
    const productIds = c.products.map((p) => p.productId);

    const during = windowProfitForProducts(salesRows, changesByProduct, currentCogs, productIds, firstAppliedAt, windowEnd);
    const prior = windowProfitForProducts(salesRows, changesByProduct, currentCogs, productIds, priorStart, firstAppliedAt);

    const days = Math.round(durationMs / (24 * 60 * 60 * 1000));
    return {
      campaignId: c.id,
      name: c.name,
      status: c.status,
      firstAppliedAt: firstAppliedAt.toISOString(),
      windowEnd: windowEnd.toISOString(),
      days,
      productsChanged: c.products.length,
      duringProfitCents: during.grossProfitCents,
      priorProfitCents: prior.grossProfitCents,
      deltaCents: during.grossProfitCents - prior.grossProfitCents,
      noPriorBaseline: !prior.hasSales,
      stillRunning: c.status !== "completed",
      estimated: during.estimated || prior.estimated,
    };
  });

  report.sort((a, b) => new Date(b.firstAppliedAt).getTime() - new Date(a.firstAppliedAt).getTime());
  return NextResponse.json(report);
});
