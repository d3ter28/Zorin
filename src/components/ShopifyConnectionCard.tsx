"use client";
import { useState, useEffect } from "react";

interface ShopifyStatus {
  connected: boolean;
  shopDomain?: string;
  lastSyncedAt?: string | null;
  webhooksActive?: boolean;
}

interface SyncResult {
  products: { created: number; updated: number; skipped: number };
  orders: { upserted: number; skippedLineItems: number };
}

type UIState = "loading" | "disconnected" | "connecting" | "connected" | "syncing";

export function ShopifyConnectionCard() {
  const [uiState, setUiState] = useState<UIState>("loading");
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [connectedDomain, setConnectedDomain] = useState<string | undefined>();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null | undefined>();
  const [webhooksActive, setWebhooksActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function fetchStatus(signal?: AbortSignal) {
    setError(null);
    try {
      const res = await fetch("/api/shopify/status", { signal });
      if (!res.ok) throw new Error("Failed to fetch Shopify status.");
      const data: ShopifyStatus = await res.json();
      if (data.connected) {
        setConnectedDomain(data.shopDomain);
        setLastSyncedAt(data.lastSyncedAt);
        setWebhooksActive(data.webhooksActive ?? false);
        setUiState("connected");
      } else {
        setUiState("disconnected");
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load Shopify status.");
      setUiState("disconnected");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal);
    return () => controller.abort();
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setUiState("connecting");
    setError(null);
    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain, accessToken, apiSecret }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Connection failed — check your credentials.");
      }
      // Re-fetch authoritative status from the server
      await fetchStatus();
      setShopDomain("");
      setAccessToken("");
      setApiSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed — try again.");
      setUiState("disconnected");
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      `Disconnect from ${connectedDomain}? This will not delete your synced products or sales data.`
    );
    if (!confirmed) return;
    setError(null);
    try {
      const res = await fetch("/api/shopify/disconnect", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Disconnect failed — try again.");
      }
      setSyncResult(null);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed — try again.");
    }
  }

  async function handleSync() {
    setUiState("syncing");
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Sync failed — try again.");
      }
      const data: SyncResult = await res.json();
      setSyncResult(data);
      // Refresh lastSyncedAt
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed — try again.");
      setUiState("connected");
    }
  }

  function formatDate(iso?: string | null): string {
    if (!iso) return "Never";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "Never" : d.toLocaleString();
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Shopify Connection</h2>

      {uiState === "loading" && (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      )}

      {(uiState === "disconnected" || uiState === "connecting") && (
        <form onSubmit={handleConnect} className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Connect your Shopify store to sync products and orders.{" "}
            <a
              href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              Where do I find these?
            </a>
          </p>
          <div>
            <label htmlFor="shopDomain" className="block text-xs font-medium text-ink mb-1">
              Shop Domain
            </label>
            <input
              id="shopDomain"
              type="text"
              placeholder="mystore.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="accessToken" className="block text-xs font-medium text-ink mb-1">
              Access Token
            </label>
            <input
              id="accessToken"
              type="password"
              placeholder="shpat_••••••••"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="apiSecret" className="block text-xs font-medium text-ink mb-1">
              API Secret Key
            </label>
            <input
              id="apiSecret"
              type="password"
              placeholder="shpss_••••••••"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={uiState === "connecting"}
            className="btn"
          >
            {uiState === "connecting" ? "Connecting…" : "Connect"}
          </button>
        </form>
      )}

      {(uiState === "connected" || uiState === "syncing") && (
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">{connectedDomain}</p>
            <p className="text-xs text-muted">
              Last synced: {formatDate(lastSyncedAt)}
            </p>
            {webhooksActive && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Live sync active
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSync}
              disabled={uiState === "syncing"}
              className="btn"
            >
              {uiState === "syncing" ? "Syncing…" : "Sync now"}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={uiState === "syncing"}
              className="btn btn-ghost"
            >
              Disconnect
            </button>
          </div>
          {syncResult && (
            <div className="mt-2">
              <p className="text-xs font-medium text-ink mb-1.5">Last sync results</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
                  {syncResult.products.created} created
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.products.updated} updated
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.products.skipped} skipped
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.orders.upserted} orders imported
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
