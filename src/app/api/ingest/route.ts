import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseCsv } from "@/lib/ingest/parseCsv";
import { applyIngest } from "@/lib/ingest/applyIngest";

export const POST = withErrorHandling(async (req: Request) => {
  const text = await req.text();
  if (text.trim() === "") {
    throw new HttpError(400, "Empty CSV body");
  }
  const parsed = parseCsv(text);
  const summary = await applyIngest(prisma, parsed);
  return NextResponse.json(summary);
});
