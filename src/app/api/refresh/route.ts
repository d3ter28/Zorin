import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { refreshProduct } from "@/lib/scrape/refreshProduct";
import { prisma } from "@/lib/db";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const ids = body.productIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "productIds must be an array of strings");
  }

  let refreshed = 0;
  let failed = 0;
  for (const id of ids as string[]) {
    const summary = await refreshProduct(prisma, id);
    refreshed += summary.refreshed;
    failed += summary.failed;
  }

  return NextResponse.json({ refreshed, failed });
});
