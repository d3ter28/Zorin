import { randomBytes, createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";

// Typed against Prisma.TransactionClient (not PrismaClient) so every
// function here can be called either with the top-level `prisma` singleton
// or with the `tx` passed into a `prisma.$transaction(async (tx) => ...)`
// callback — a real PrismaClient satisfies this narrower shape too, since
// TransactionClient is PrismaClient minus $transaction/$connect/etc.
type Db = Prisma.TransactionClient;

export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateInvitationResult {
  token: string;
  invitation: { id: string; email: string; expiresAt: Date };
}

// One *pending* invitation per (merchant, email) at a time. Creating a new
// one for the same pair deletes any existing pending row first — this same
// function is used for both the initial invite and the explicit "resend"
// action, so resend naturally invalidates the old link.
export async function createInvitation(
  prisma: Db,
  params: { merchantId: string; email: string; invitedByUserId: string },
): Promise<CreateInvitationResult> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

  await prisma.invitation.deleteMany({
    where: { merchantId: params.merchantId, email: params.email, acceptedAt: null },
  });
  const invitation = await prisma.invitation.create({
    data: {
      merchantId: params.merchantId,
      email: params.email,
      tokenHash,
      invitedByUserId: params.invitedByUserId,
      expiresAt,
    },
  });

  return {
    token,
    invitation: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt },
  };
}

export interface ValidInvitation {
  id: string;
  merchantId: string;
  email: string;
}

// Null for not-found, already-accepted, or expired — callers show one
// generic "this invite link is no longer valid" state for all three, same
// no-distinguishing-reasons posture as consumePasswordResetToken.
export async function findValidInvitation(
  prisma: Db,
  rawToken: string,
): Promise<ValidInvitation | null> {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!invitation) return null;
  if (invitation.acceptedAt) return null;
  if (invitation.expiresAt.getTime() <= Date.now()) return null;
  return { id: invitation.id, merchantId: invitation.merchantId, email: invitation.email };
}

export async function markInvitationAccepted(prisma: Db, id: string): Promise<void> {
  await prisma.invitation.update({ where: { id }, data: { acceptedAt: new Date() } });
}

export async function revokeInvitation(prisma: Db, id: string, merchantId: string): Promise<void> {
  const result = await prisma.invitation.deleteMany({
    where: { id, merchantId, acceptedAt: null },
  });
  if (result.count === 0) throw new HttpError(404, "Not found");
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface PendingInvite {
  id: string;
  email: string;
  expiresAt: Date;
  expired: boolean;
}

export async function listTeam(
  prisma: Db,
  merchantId: string,
): Promise<{ members: TeamMember[]; pendingInvites: PendingInvite[] }> {
  const [users, invitations] = await Promise.all([
    prisma.user.findMany({ where: { merchantId }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { merchantId, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const now = Date.now();
  return {
    members: users.map((u) => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt })),
    pendingInvites: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      expiresAt: i.expiresAt,
      expired: i.expiresAt.getTime() <= now,
    })),
  };
}
