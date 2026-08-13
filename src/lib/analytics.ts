declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fires a GA4 event via the gtag() loaded in layout.tsx. No-ops if gtag
 * hasn't loaded yet (it's lazyOnload) rather than blocking the caller. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}
