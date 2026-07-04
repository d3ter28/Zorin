"use client";
import { useEffect, useState } from "react";

export function CompetitorSettings() {
  const [domains, setDomains] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/competitors")
      .then((r) => r.json())
      .then((d) => {
        setDomains(d.domains ?? []);
        setLoading(false);
      });
  }, []);

  function handleAdd() {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || domains.includes(trimmed)) return;
    setDomains([...domains, trimmed]);
    setInput("");
  }

  function handleRemove(domain: string) {
    setDomains(domains.filter((d) => d !== domain));
  }

  async function handleSave() {
    await fetch("/api/settings/competitors", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domains }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h2>Competitor Domains</h2>
      <p className="text-sm text-gray-500">
        Domains added here will be used when discovering competitors for your products.
      </p>
      <ul>
        {domains.map((d) => (
          <li key={d}>
            <span>{d}</span>
            <button onClick={() => handleRemove(d)} aria-label={`Remove ${d}`}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. walmart.com"
          aria-label="new competitor domain"
        />
        <button onClick={handleAdd}>Add</button>
      </div>
      <button onClick={handleSave}>Save</button>
      {saved && <p>Saved!</p>}
    </div>
  );
}
