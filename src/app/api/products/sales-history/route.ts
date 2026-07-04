import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseSalesHistoryCsv } from "@/lib/salesHistory/parseSalesHistoryCsv";
import { importSalesHistory } from "@/lib/salesHistory/importSalesHistory";
import { requireSessionApi } from "@/lib/auth/requireSession";

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

  const { imported, unknownSkus } = await importSalesHistory(prisma, merchantId, rows);

  return NextResponse.json({
    imported,
    skipped: unknownSkus.length,
    errors,
    unknownSkus,
  });
});
