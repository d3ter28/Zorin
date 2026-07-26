import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const POST = withErrorHandling(async (req: Request) => {
  const { merchantId } = await requireSessionApi();
  const body = await parseJsonBody(req);

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) throw new HttpError(400, "Message is required");
  if (message.length > 2000) throw new HttpError(400, "Message too long (max 2000 characters)");

  await prisma.feedback.create({ data: { merchantId, message } });

  return NextResponse.json({ ok: true });
});
