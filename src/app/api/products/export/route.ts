import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/errors";
import { requireSessionApi } from "@/lib/auth/requireSession";

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export const GET = withErrorHandling(async (_req: Request) => {
  const { merchantId } = await requireSessionApi();

  const products = await prisma.product.findMany({
    where: { merchantId },
    include: { recommendation: true },
    orderBy: { title: "asc" },
  });

  const headers = ["sku", "title", "current_price", "cogs", "margin_pct", "recommended_action", "suggested_price"];

  const rows = products.map((p) => {
    const priceDollars = (p.currentPrice / 100).toFixed(2);
    const cogsDollars = p.cogs !== null ? (p.cogs! / 100).toFixed(2) : "";
    const margin =
      p.cogs !== null && p.currentPrice > 0
        ? (((p.currentPrice - p.cogs!) / p.currentPrice) * 100).toFixed(1)
        : "";

    let action = "";
    let suggestedPrice = "";
    if (p.recommendation) {
      action = p.recommendation.action;
      try {
        const rules = JSON.parse(p.recommendation.rulesJson) as { suggestedPriceCents?: number };
        if (rules.suggestedPriceCents) {
          suggestedPrice = (rules.suggestedPriceCents / 100).toFixed(2);
        }
      } catch {
        // ignore malformed rulesJson
      }
    }

    return [p.sku, p.title, priceDollars, cogsDollars, margin, action, suggestedPrice]
      .map(csvField)
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zorin-products.csv"',
    },
  });
});
