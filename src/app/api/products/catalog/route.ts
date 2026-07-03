import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseProductCsv } from "@/lib/products/parseProductCsv";
import { importProducts } from "@/lib/products/importProducts";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const text = await req.text();
  if (text.trim() === "") {
    throw new HttpError(400, "Empty CSV body");
  }
  const parsed = parseProductCsv(text);
  const summary = await importProducts(prisma, merchantId, parsed);
  return NextResponse.json(summary);
});
