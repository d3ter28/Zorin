import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">PriceIQ</h1>
        <p className="mt-1 text-sm text-muted">
          Competitor-aware pricing recommendations · Demo Store
        </p>
      </header>
      <Dashboard />
    </main>
  );
}
