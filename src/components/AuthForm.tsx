"use client";
import { useState } from "react";

interface Field {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "url";
  placeholder?: string;
  required?: boolean;
}

export function AuthForm({
  fields,
  submitLabel,
  endpoint,
  onSuccess,
  extraFields,
}: {
  fields: Field[];
  submitLabel: string;
  endpoint: string;
  onSuccess?: () => void | Promise<void>;
  /** Extra values merged into the POST body that aren't rendered as inputs
   * (e.g. a plan tier already chosen via a query param elsewhere on the page). */
  extraFields?: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, ...extraFields }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      if (onSuccess) {
        await onSuccess();
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="text-sm text-muted">{f.label}</span>
          <input
            type={f.type}
            required={f.required !== false}
            placeholder={f.placeholder}
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </label>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
