import { NextResponse } from "next/server";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { applyDecision } from "@/lib/apply";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  const ids = body.productIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "productIds must be an array of strings");
  }

  let applied = 0;
  let skipped = 0;
  for (const id of ids as string[]) {
    const result = await applyDecision(id);
    if (result.found && result.applied) {
      applied++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ applied, skipped });
});
