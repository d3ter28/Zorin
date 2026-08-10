import { requireSessionPage } from "@/lib/auth/requireSession";
import { prisma } from "@/lib/db";
import { UpdateNameCard } from "@/components/UpdateNameCard";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

export default async function AccountSettingsPage() {
  const session = await requireSessionPage();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  return (
    <div className="space-y-6">
      <UpdateNameCard initialName={user?.name ?? ""} />
      <ChangePasswordCard />
    </div>
  );
}
