import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { ReactivatePlanPicker } from "@/components/ReactivatePlanPicker";

export default async function ReactivatePage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUser(prisma, token) : null;
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-8 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">Your trial has ended</h1>
      <p className="mt-2 text-sm text-muted">
        Choose a plan to keep using Zorin — your products and pricing history are all still here.
      </p>
      <ReactivatePlanPicker />
    </div>
  );
}
