"use client";
import { useState, useEffect } from "react";

interface WooCommerceStatus {
  connected: boolean;
  storeUrl?: string;
  lastSyncedAt?: string | null;
  webhooksActive?: boolean;
}

interface SyncResult {
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  ordersImported: number;
}

type UIState = "loading" | "disconnected" | "connecting" | "connected" | "syncing";

export function WooCommerceConnectionCard() {
  const [uiState, setUiState] = useState<UIState>("loading");
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [connectedHost, setConnectedHost] = useState<string | undefined>();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null | undefined>();
  const [webhooksActive, setWebhooksActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  async function fetchStatus(signal?: AbortSignal) {
    setError(null);
    try {
      const res = await fetch("/api/woocommerce/status", { signal });
      if (!res.ok) throw new Error("Failed to fetch WooCommerce status.");
      const data: WooCommerceStatus = await res.json();
      if (data.connected && data.storeUrl) {
        try {
          setConnectedHost(new URL(data.storeUrl).hostname);
        } catch {
          setConnectedHost(data.storeUrl);
        }
        setLastSyncedAt(data.lastSyncedAt);
        setWebhooksActive(data.webhooksActive ?? false);
        setUiState("connected");
      } else {
        setUiState("disconnected");
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load WooCommerce status.");
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
    // Normalize storeUrl: prepend https:// if no protocol present
    const normalizedUrl = storeUrl.startsWith("http://") || storeUrl.startsWith("https://")
      ? storeUrl
      : `https://${storeUrl}`;
    try {
      const res = await fetch("/api/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl: normalizedUrl, consumerKey, consumerSecret }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Connection failed — check your credentials.");
      }
      await fetchStatus();
      setStoreUrl("");
      setConsumerKey("");
      setConsumerSecret("");
      setShowHelp(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed — try again.");
      setUiState("disconnected");
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      `Disconnect from ${connectedHost}? This will not delete your synced products or sales data.`
    );
    if (!confirmed) return;
    setError(null);
    try {
      const res = await fetch("/api/woocommerce/disconnect", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Disconnect failed — try again.");
      }
      setSyncResult(null);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed — try again.");
      setUiState("connected");
    }
  }

  async function handleSync() {
    setUiState("syncing");
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/woocommerce/sync", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Sync failed — try again.");
      }
      const data: SyncResult = await res.json();
      setSyncResult(data);
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
      <h2 className="text-sm font-semibold text-ink">WooCommerce Connection</h2>

      {uiState === "loading" && (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      )}

      {(uiState === "disconnected" || uiState === "connecting") && (
        <form onSubmit={handleConnect} className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Connect your WooCommerce store to sync products and orders.{" "}
            <button
              type="button"
              onClick={() => setShowHelp((prev) => !prev)}
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              Where do I find these?
            </button>
          </p>
          {showHelp && (
            <p className="text-xs text-muted rounded-lg border border-line bg-panel px-3 py-2">
              To create API keys: go to WooCommerce → Settings → Advanced → REST API, then click
              &ldquo;Add key&rdquo;. Set permissions to &ldquo;Read/Write&rdquo; and copy the Consumer Key and
              Consumer Secret.
            </p>
          )}
          <div>
            <label htmlFor="wc-storeUrl" className="block text-xs font-medium text-ink mb-1">
              Store URL
            </label>
            <input
              id="wc-storeUrl"
              type="text"
              placeholder="https://mystore.com"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="wc-consumerKey" className="block text-xs font-medium text-ink mb-1">
              Consumer Key
            </label>
            <input
              id="wc-consumerKey"
              type="password"
              placeholder="ck_••••••••"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              disabled={uiState === "connecting"}
              required
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="wc-consumerSecret" className="block text-xs font-medium text-ink mb-1">
              Consumer Secret
            </label>
            <input
              id="wc-consumerSecret"
              type="password"
              placeholder="cs_••••••••"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
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
            <p className="text-sm font-medium text-ink">{connectedHost}</p>
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
                  {syncResult.productsCreated} created
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.productsUpdated} updated
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.productsSkipped} skipped
                </span>
                <span className="rounded-full bg-panel px-2.5 py-1 text-muted">
                  {syncResult.ordersImported} orders imported
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
