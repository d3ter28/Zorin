"use client";
import { useRef, useState } from "react";

interface UploadResult {
  imported: number;
  skipped: number;
  errors: { line: number; reason: string }[];
  unknownSkus: string[];
  fitted?: number;
  recommended?: number;
  fitSkipped?: string[];
  recommendSkipped?: string[];
}

export function SalesHistoryUpload({ onSuccess, autoML = true }: { onSuccess?: () => void; autoML?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setState("uploading");
    setResult(null);
    setFatalError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const url = autoML ? "/api/products/sales-history?autoML=true" : "/api/products/sales-history";
      const res = await fetch(url, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setFatalError(json.error ?? "Upload failed");
        setState("error");
        return;
      }
      setResult(json);
      setState("done");
      onSuccess?.();
    } catch {
      setFatalError("Network error — try again");
      setState("error");
    }
  }

  const sample = "sku,date,units_sold,price\nSKU-001,2024-01-01,12,29.99\nSKU-001,2024-02-01,9,34.99";
  const sampleUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Upload Sales History</h2>
        <a href={sampleUrl} download="sales_history_sample.csv" className="text-xs text-accent hover:underline">
          Download sample CSV
        </a>
      </div>
      <p className="mt-1 text-xs text-muted">
        Format: <code className="text-ink">sku, date (YYYY-MM-DD), units_sold, price</code>
      </p>
      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          className="btn btn-primary"
          disabled={state === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          {state === "uploading" ? "Uploading…" : "Choose CSV file"}
        </button>
      </div>
      {state === "done" && result && (
        <div className="mt-3 text-xs">
          <p className="text-positive font-medium">
            ✓ Imported {result.imported} record{result.imported !== 1 ? "s" : ""}
            {result.skipped > 0 && `, skipped ${result.skipped} unknown SKU${result.skipped !== 1 ? "s" : ""}`}
          </p>
          {result.fitted != null && result.recommended != null && (
            <p className="text-positive font-medium">
              Fitted {result.fitted} model{result.fitted !== 1 ? "s" : ""}, generated {result.recommended} recommendation{result.recommended !== 1 ? "s" : ""}
            </p>
          )}
          {result.fitSkipped && result.fitSkipped.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-warning">
                {result.fitSkipped.length} product{result.fitSkipped.length !== 1 ? "s" : ""} need more data
              </summary>
              <ul className="ml-4 mt-1 text-muted">
                {result.fitSkipped.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </details>
          )}
          {result.recommendSkipped && result.recommendSkipped.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-warning">
                {result.recommendSkipped.length} product{result.recommendSkipped.length !== 1 ? "s" : ""} need COGS for recommendations
              </summary>
              <ul className="ml-4 mt-1 text-muted">
                {result.recommendSkipped.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </details>
          )}
          {result.unknownSkus.length > 0 && (
            <p className="mt-1 text-warning">Unknown SKUs: {result.unknownSkus.join(", ")}</p>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-1 text-danger space-y-0.5">
              {result.errors.slice(0, 5).map((e) => (
                <li key={e.line}>Line {e.line}: {e.reason}</li>
              ))}
              {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
      {state === "error" && fatalError && (
        <p className="mt-3 text-xs text-danger" role="alert">{fatalError}</p>
      )}
    </div>
  );
}
