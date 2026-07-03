import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { refreshProduct } from "@/lib/scrape/refreshProduct";
import { prisma } from "@/lib/db";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { filterOwnedProductIds } from "@/lib/auth/ownership";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);
  const ids = body.productIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "productIds must be an array of strings");
  }

  const ownedIds = await filterOwnedProductIds(prisma, ids as string[], merchantId);

  let refreshed = 0;
  let failed = 0;
  for (const id of ownedIds) {
    const summary = await refreshProduct(prisma, id);
    refreshed += summary.refreshed;
    failed += summary.failed;
  }

  return NextResponse.json({ refreshed, failed });
});
