"use client";
import { useState } from "react";

export function UpdateNameCard({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Name is required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setError(data.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      setName(trimmed);
      setSuccess(true);
      setBusy(false);
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Name</h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">Your name</span>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field mt-1 w-full"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {success && <p className="text-sm text-positive">Name updated.</p>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Saving…" : "Update account"}
        </button>
      </form>
    </section>
  );
}
