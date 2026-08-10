import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/validation";
import { requireSessionApi } from "@/lib/auth/requireSession";

export const PATCH = withErrorHandling(async (req: Request) => {
  const { user } = await requireSessionApi();

  const body = await parseJsonBody(req);
  const rawName = typeof body.name === "string" ? body.name : "";
  const name = rawName.trim();

  if (name === "") throw new HttpError(400, "Name is required");
  if (name.length > 100) throw new HttpError(400, "Name must be 100 characters or fewer");

  await prisma.user.update({ where: { id: user.id }, data: { name } });

  return NextResponse.json({ ok: true, name });
});
