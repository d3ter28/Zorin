import { requireSessionPage } from "@/lib/auth/requireSession";
import { TeamCard } from "@/components/TeamCard";

export default async function TeamSettingsPage() {
  const user = await requireSessionPage();
  return <TeamCard currentUserId={user.user.id} currentUserRole={user.user.role} />;
}
