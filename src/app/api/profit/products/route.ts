import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { productProfit, type CogsChangeRow, type SalesRow } from "@/lib/profit/computeProfit";

const ALLOWED_WINDOWS = [30, 90, 365];

export const GET = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const raw = Number(new URL(req.url).searchParams.get("window"));
  const window = ALLOWED_WINDOWS.includes(raw) ? raw : 90;

  const now = new Date();
  // windowEnd is exclusive in productProfit, so set it to start of tomorrow to include all of today
  const windowEnd = new Date(now);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
  windowEnd.setUTCHours(0, 0, 0, 0);
  const windowStart = new Date(now.getTime() - window * 24 * 60 * 60 * 1000);

  const [sales, products, cogsChanges] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { merchantId, promotionFlag: false, date: { gte: windowStart } },
      select: { productId: true, date: true, unitsSold: true, priceCents: true },
    }),
    prisma.product.findMany({ where: { merchantId }, select: { id: true, cogs: true, title: true, sku: true } }),
    prisma.cogsChange.findMany({
      where: { merchantId },
      select: { productId: true, toCents: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const currentCogs = new Map<string, number | null>(products.map((p) => [p.id, p.cogs]));
  const meta = new Map(products.map((p) => [p.id, { title: p.title, sku: p.sku }]));
  const changesByProduct = new Map<string, CogsChangeRow[]>();
  for (const c of cogsChanges) {
    const list = changesByProduct.get(c.productId) ?? [];
    list.push({ toCents: c.toCents, changedAt: c.changedAt });
    changesByProduct.set(c.productId, list);
  }

  const salesRows: SalesRow[] = sales.map((s) => ({
    productId: s.productId, date: s.date, unitsSold: s.unitsSold, priceCents: s.priceCents,
  }));

  const rows = productProfit(salesRows, changesByProduct, currentCogs, windowStart, windowEnd)
    .map((p) => ({ ...p, title: meta.get(p.productId)?.title ?? "Unknown", sku: meta.get(p.productId)?.sku ?? "" }))
    .sort((a, b) => b.grossProfitCents - a.grossProfitCents);

  return NextResponse.json({ window, products: rows });
});
