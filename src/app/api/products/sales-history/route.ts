import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseSalesHistoryCsv } from "@/lib/salesHistory/parseSalesHistoryCsv";
import { importSalesHistory } from "@/lib/salesHistory/importSalesHistory";
import { requireSessionApi } from "@/lib/auth/requireSession";
import { runBulkML } from "@/lib/salesHistory/bulkML";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new HttpError(400, "file field required");
  }

  const text = await file.text();
  const { rows, errors } = parseSalesHistoryCsv(text);

  if (rows.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: "no valid rows", errors }, { status: 400 });
  }

  const result = await importSalesHistory(prisma, merchantId, rows);

  let autoML = false;
  try {
    autoML = new URL(req.url).searchParams.get("autoML") === "true";
  } catch {
    // req.url is relative or missing; treat as no autoML
  }

  let mlResult = null;
  if (autoML && result.importedProductIds.length > 0) {
    mlResult = await runBulkML(prisma, result.importedProductIds);
  }

  return NextResponse.json({
    imported: result.imported,
    skipped: result.unknownSkus.length,
    errors,
    unknownSkus: result.unknownSkus,
    ...(mlResult && {
      fitted: mlResult.fitted,
      recommended: mlResult.recommended,
      fitSkipped: mlResult.fitSkipped,
      recommendSkipped: mlResult.recommendSkipped,
    }),
  });
});
