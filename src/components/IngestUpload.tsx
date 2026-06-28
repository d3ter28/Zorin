"use client";
import { useState } from "react";

interface Summary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

export function IngestUpload() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setSummary(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      setSummary(await res.json());
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-uploading the same file
      // Reload so the products table reflects new prices and cleared recommendations.
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  return (
    <div className="mb-6 rounded border border-gray-200 p-4">
      <label className="block text-sm font-medium">
        Upload competitor prices (CSV: sku,competitor_name,price)
      </label>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        disabled={busy}
        className="mt-2 text-sm"
      />
      {summary && (
        <div className="mt-3 text-sm">
          <div>
            {summary.inserted} inserted, {summary.updated} updated, {summary.skipped} skipped
          </div>
          {summary.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {summary.errors.map((er, i) => (
                <li key={i}>line {er.line}: {er.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
