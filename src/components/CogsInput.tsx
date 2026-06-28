"use client";
import { useState } from "react";

export function CogsInput({
  productId,
  initialCents,
  onSaved,
}: {
  productId: string;
  initialCents: number | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(
    initialCents === null ? "" : (initialCents / 100).toFixed(2),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const cents = value === "" ? null : Math.round(Number(value) * 100);
    await fetch(`/api/products/${productId}/cogs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cogs: cents }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <input
      className="w-20 rounded border px-2 py-1 text-right"
      value={value}
      placeholder="—"
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
    />
  );
}
