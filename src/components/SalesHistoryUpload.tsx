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

  const sample = [
    "sku,date,units_sold,price",
    "TEE-001,2025-10-01,18,32.00","TEE-001,2025-11-01,22,32.00","TEE-001,2025-12-01,30,28.00","TEE-001,2026-01-01,14,32.00","TEE-001,2026-02-01,11,35.00","TEE-001,2026-03-01,15,32.00","TEE-001,2026-04-01,21,30.00","TEE-001,2026-05-01,19,32.00","TEE-001,2026-06-01,18,32.00","TEE-001,2026-07-01,22,34.00",
    "BEAN-002,2025-10-01,11,28.00","BEAN-002,2025-11-01,16,26.00","BEAN-002,2025-12-01,22,26.00","BEAN-002,2026-01-01,10,28.00","BEAN-002,2026-02-01,8,30.00","BEAN-002,2026-03-01,9,28.00","BEAN-002,2026-04-01,7,28.00","BEAN-002,2026-05-01,6,28.00","BEAN-002,2026-06-01,8,28.00","BEAN-002,2026-07-01,10,28.00",
    "BOT-003,2025-10-01,22,18.00","BOT-003,2025-11-01,30,16.00","BOT-003,2025-12-01,40,16.00","BOT-003,2026-01-01,20,18.00","BOT-003,2026-02-01,17,20.00","BOT-003,2026-03-01,19,18.00","BOT-003,2026-04-01,23,18.00","BOT-003,2026-05-01,26,18.00","BOT-003,2026-06-01,24,18.00","BOT-003,2026-07-01,27,18.00",
    "TOTE-004,2025-10-01,12,25.00","TOTE-004,2025-11-01,18,23.00","TOTE-004,2025-12-01,25,22.00","TOTE-004,2026-01-01,11,25.00","TOTE-004,2026-02-01,9,27.00","TOTE-004,2026-03-01,12,25.00","TOTE-004,2026-04-01,14,25.00","TOTE-004,2026-05-01,16,25.00","TOTE-004,2026-06-01,15,25.00","TOTE-004,2026-07-01,17,25.00",
    "BRUSH-005,2025-10-01,32,12.00","BRUSH-005,2025-11-01,45,11.00","BRUSH-005,2025-12-01,58,11.00","BRUSH-005,2026-01-01,30,12.00","BRUSH-005,2026-02-01,26,13.00","BRUSH-005,2026-03-01,28,12.00","BRUSH-005,2026-04-01,33,12.00","BRUSH-005,2026-05-01,36,12.00","BRUSH-005,2026-06-01,34,12.00","BRUSH-005,2026-07-01,38,12.00",
    "CAND-006,2025-10-01,18,22.00","CAND-006,2025-11-01,28,20.00","CAND-006,2025-12-01,38,20.00","CAND-006,2026-01-01,16,22.00","CAND-006,2026-02-01,13,24.00","CAND-006,2026-03-01,15,22.00","CAND-006,2026-04-01,18,22.00","CAND-006,2026-05-01,20,22.00","CAND-006,2026-06-01,19,22.00","CAND-006,2026-07-01,21,22.00",
    "WALL-007,2025-10-01,8,45.00","WALL-007,2025-11-01,13,42.00","WALL-007,2025-12-01,18,42.00","WALL-007,2026-01-01,7,45.00","WALL-007,2026-02-01,6,48.00","WALL-007,2026-03-01,8,45.00","WALL-007,2026-04-01,9,45.00","WALL-007,2026-05-01,10,45.00","WALL-007,2026-06-01,9,45.00","WALL-007,2026-07-01,11,45.00",
    "MUG-008,2025-10-01,19,16.00","MUG-008,2025-11-01,30,14.00","MUG-008,2025-12-01,40,14.00","MUG-008,2026-01-01,18,16.00","MUG-008,2026-02-01,15,18.00","MUG-008,2026-03-01,17,16.00","MUG-008,2026-04-01,20,16.00","MUG-008,2026-05-01,22,16.00","MUG-008,2026-06-01,21,16.00","MUG-008,2026-07-01,23,16.00",
  ].join("\n");
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
