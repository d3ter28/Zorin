"use client";
import { useEffect, useState } from "react";

export function IntegrationTile({
  name,
  description,
  logoSrc,
  logoAlt,
  statusUrl,
  getConnectedLabel,
  onOpen,
}: {
  name: string;
  description: string;
  logoSrc: string;
  logoAlt: string;
  statusUrl: string;
  getConnectedLabel: (data: Record<string, unknown>) => string | null;
  onOpen: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(statusUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { connected: false }))
      .then((data: Record<string, unknown>) => {
        const isConnected = Boolean(data.connected);
        setConnected(isConnected);
        setLabel(isConnected ? getConnectedLabel(data) : null);
      })
      .catch((err) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setConnected(false);
        setLabel(null);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusUrl]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-start rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:bg-panel"
    >
      <img src={logoSrc} alt={logoAlt} className="h-6 w-6 object-contain" />
      <p className="mt-2 text-sm font-semibold text-ink">{name}</p>
      <p className="mt-1 text-xs text-muted">{connected && label ? label : description}</p>
      {connected && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          Connected
        </span>
      )}
      <span className="mt-2 text-xs font-medium text-accent">{connected ? "Manage →" : "Connect →"}</span>
    </button>
  );
}
