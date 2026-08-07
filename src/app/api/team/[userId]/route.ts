import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, withErrorHandling } from "@/lib/api/errors";
import { requireOwnerApi } from "@/lib/auth/requireSession";
import { destroyAllSessions } from "@/lib/auth/session";

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await requireOwnerApi();
    const { userId } = await params;

    if (userId === session.user.id) {
      throw new HttpError(400, "The account owner cannot remove themselves");
    }

    const target = await prisma.user.findFirst({ where: { id: userId, merchantId: session.merchantId } });
    if (!target) throw new HttpError(404, "Not found");

    await destroyAllSessions(prisma, userId);
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  },
);
