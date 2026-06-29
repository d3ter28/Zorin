import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseProductCsv } from "@/lib/products/parseProductCsv";
import { importProducts } from "@/lib/products/importProducts";

/**
 * Resolve the merchant to import into. There is no auth yet, so we target the
 * single existing merchant (the seeded demo store) or create a default one.
 */
async function resolveMerchantId(): Promise<string> {
  const existing = await prisma.merchant.findFirst();
  if (existing) return existing.id;
  const created = await prisma.merchant.create({
    data: { name: "My Store", storeUrl: "" },
  });
  return created.id;
}

export const POST = withErrorHandling(async (req: Request) => {
  const text = await req.text();
  if (text.trim() === "") {
    throw new HttpError(400, "Empty CSV body");
  }
  const parsed = parseProductCsv(text);
  const merchantId = await resolveMerchantId();
  const summary = await importProducts(prisma, merchantId, parsed);
  return NextResponse.json(summary);
});
