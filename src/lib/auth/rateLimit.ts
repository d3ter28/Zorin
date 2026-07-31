import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Webhook receivers see legitimate bursts (a flash sale can fire a dozen+
// order/product webhooks in seconds, plus platform retries) so they get a
// much higher-throughput limiter than the auth (login/signup) one above.
// This still blocks garbage/DoS traffic hammering the endpoint.
const WEBHOOK_WINDOW_MS = 60 * 1000;
const WEBHOOK_MAX_ATTEMPTS = 100;

// ---------------------------------------------------------------------------
// Redis-backed limiter (Upstash) — used when env vars are present
// ---------------------------------------------------------------------------

let redisLimiter: Ratelimit | null = null;
let redisWebhookLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  redisLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "15 m"),
    prefix: "zorin:rl",
  });

  redisWebhookLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(WEBHOOK_MAX_ATTEMPTS, "1 m"),
    prefix: "zorin:webhook-rl",
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
const webhookStore = new Map<string, Entry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key);
  }
  for (const [key, entry] of webhookStore) {
    if (now - entry.windowStart > WEBHOOK_WINDOW_MS) webhookStore.delete(key);
  }
}, 10 * 60 * 1000).unref();

function checkStore(
  map: Map<string, Entry>,
  key: string,
  windowMs: number,
  maxAttempts: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    map.set(key, { attempts: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.attempts += 1;

  if (entry.attempts > maxAttempts) {
    return { allowed: false, retryAfterMs: windowMs - (now - entry.windowStart) };
  }

  return { allowed: true, retryAfterMs: 0 };
}

function checkInMemory(ip: string): { allowed: boolean; retryAfterMs: number } {
  return checkStore(store, ip, WINDOW_MS, MAX_ATTEMPTS);
}

function checkWebhookInMemory(key: string): { allowed: boolean; retryAfterMs: number } {
  return checkStore(webhookStore, key, WEBHOOK_WINDOW_MS, WEBHOOK_MAX_ATTEMPTS);
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

// Burst-tolerant limiter for webhook receivers (Shopify/WooCommerce). Uses a
// separate bucket/prefix so webhook traffic never shares a budget with the
// stricter auth limiter above.
export async function checkWebhookRateLimit(key: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (redisWebhookLimiter) {
    const { success, reset } = await redisWebhookLimiter.limit(key);
    return { allowed: success, retryAfterMs: success ? 0 : reset - Date.now() };
  }
  return checkWebhookInMemory(key);
}

export function clearWebhookRateLimit(key: string): void {
  webhookStore.delete(key);
}
