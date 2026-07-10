"use client";
import { useState } from "react";

interface Summary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

const SAMPLE_CSV =
  "sku,title,current_price,category,cogs,est_units\n" +
  "SKU-001,Wireless Headphones,79.99,Electronics,28.00,120\n" +
  "SKU-002,Leather Wallet,34.99,Accessories,9.00,200\n" +
  "SKU-003,Yoga Mat,42.99,Fitness,13.50,95\n";

export function ProductUpload({ onImported }: { onImported: () => void }) {
  const sampleCsvUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(SAMPLE_CSV);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setSummary(null);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/products/catalog", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Import failed — check the file format.");
      }
      const data: Summary = await res.json();
      setSummary(data);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed — try again.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Import product catalog</h2>
          <p className="mt-0.5 text-xs text-muted">
            CSV columns:{" "}
            <span className="font-mono">sku, title, current_price, category, cogs, est_units</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={sampleCsvUrl}
            download="product_catalog_template.csv"
            className="text-xs text-accent hover:underline"
          >
            Download template
          </a>
          <label className="btn btn-ghost cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              disabled={busy}
              className="sr-only"
            />
            {busy ? "Importing…" : "Choose CSV"}
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
              {summary.inserted} added
            </span>
            <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
              {summary.updated} updated
            </span>
            <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
              {summary.skipped} skipped
            </span>
          </div>
          {summary.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-danger">
              {summary.errors.map((er, i) => (
                <li key={i}>
                  Line {er.line}: {er.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
