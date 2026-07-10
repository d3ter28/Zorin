/**
 * In-memory sliding-window rate limiter for login attempts.
 * Keyed by IP address. Resets on process restart (acceptable for a
 * single-instance SMB deployment; swap for Redis in multi-instance setups).
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10; // per IP per window

interface Entry {
  attempts: number;
  windowStart: number;
}

const store = new Map<string, Entry>();

// Prune stale entries every 10 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key);
  }
}, 10 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { attempts: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.attempts += 1;

  if (entry.attempts > MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function clearRateLimit(ip: string): void {
  store.delete(ip);
}
