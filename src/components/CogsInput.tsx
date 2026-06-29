"use client";
import { useState } from "react";

export function CogsInput({
  productId,
  initialCents,
  onSaved,
  label,
}: {
  productId: string;
  initialCents: number | null;
  onSaved: () => void;
  /** Accessible name, e.g. "Cost of goods for Organic Cotton Tee". */
  label: string;
}) {
  const initial = initialCents === null ? "" : (initialCents / 100).toFixed(2);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save() {
    if (value === initial) return; // nothing changed — skip the round-trip
    setSaving(true);
    setFailed(false);
    const cents = value === "" ? null : Math.round(Number(value) * 100);
    try {
      const res = await fetch(`/api/products/${productId}/cogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cogs: cents }),
      });
      if (!res.ok) throw new Error("save failed");
      setValue(cents === null ? "" : (cents / 100).toFixed(2));
      onSaved();
    } catch {
      setFailed(true);
      setValue(initial); // revert to last known-good value
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      className="field w-20 text-right tabular"
      style={failed ? { borderColor: "var(--danger)" } : undefined}
      value={value}
      placeholder="—"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={failed}
      title={failed ? "Couldn't save cost — reverted to the previous value." : undefined}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
    />
  );
}
