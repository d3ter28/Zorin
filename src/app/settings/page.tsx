import { CompetitorSettings } from "@/components/CompetitorSettings";

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <CompetitorSettings />
    </main>
  );
}
