import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// ---------------------------------------------------------------------------
// Redis-backed limiter (Upstash) — used when env vars are present
// ---------------------------------------------------------------------------

let redisLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisLimiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "15 m"),
    prefix: "zorin:rl",
  });
}

// ---------------------------------------------------------------------------
// In-memory fallback — single process only, resets on restart
// ---------------------------------------------------------------------------

interface Entry {
  attempts: number;
  windowStart: number;
}

const store = new Map<string, Entry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key);
  }
}, 10 * 60 * 1000);

function checkInMemory(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { attempts: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.attempts += 1;

  if (entry.attempts > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - entry.windowStart) };
  }

  return { allowed: true, retryAfterMs: 0 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (redisLimiter) {
    const { success, reset } = await redisLimiter.limit(ip);
    return { allowed: success, retryAfterMs: success ? 0 : reset - Date.now() };
  }
  return checkInMemory(ip);
}

export function clearRateLimit(ip: string): void {
  store.delete(ip);
}
