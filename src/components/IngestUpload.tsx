"use client";
import { useState } from "react";

interface Summary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

export function IngestUpload({ onIngested }: { onIngested: () => void }) {
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
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Upload failed — check the file format.");
      }
      const data: Summary = await res.json();
      setSummary(data);
      // Refresh the table in place; the summary below stays visible.
      onIngested();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.");
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-uploading the same file
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Import competitor prices</h2>
          <p className="mt-0.5 text-xs text-muted">
            CSV columns:{" "}
            <span className="font-mono">
              sku, competitor_name, price, competitor_url
            </span>
          </p>
          <p className="mt-0.5 text-xs text-faint">
            <span className="font-mono">competitor_url</span> is optional and
            enables automatic price refresh.
          </p>
        </div>
        <label className="btn btn-ghost cursor-pointer">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            disabled={busy}
            className="sr-only"
          />
          {busy ? "Uploading…" : "Choose CSV"}
        </label>
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
              {summary.inserted} inserted
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
