import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { applyDecision } from "@/lib/apply";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { filterOwnedProductIds } from "@/lib/auth/ownership";
import { prisma } from "@/lib/db";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);
  const ids = body.productIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "productIds must be an array of strings");
  }

  const ownedIds = await filterOwnedProductIds(prisma, ids as string[], merchantId);

  let applied = 0;
  let skipped = 0;
  for (const id of ownedIds) {
    const result = await applyDecision(id);
    if (result.found && result.applied) {
      applied++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ applied, skipped });
});
