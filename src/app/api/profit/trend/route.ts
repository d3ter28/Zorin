import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { monthlyPnL, type CogsChangeRow, type SalesRow } from "@/lib/profit/computeProfit";

const MONTHS = 24;

export const GET = withErrorHandling(async () => {
  const { merchantId } = await requireSessionApi();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS);

  const [sales, products, cogsChanges] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { merchantId, promotionFlag: false, date: { gte: cutoff } },
      select: { productId: true, date: true, unitsSold: true, priceCents: true },
    }),
    prisma.product.findMany({ where: { merchantId }, select: { id: true, cogs: true } }),
    prisma.cogsChange.findMany({
      where: { merchantId },
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

  const result = monthlyPnL(salesRows, changesByProduct, currentCogs, MONTHS, new Date());
  return NextResponse.json(result);
});
