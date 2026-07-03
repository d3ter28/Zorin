import { lookup as dnsLookup } from "node:dns";
import { Agent } from "undici";
import { isPrivateIp } from "./urlGuard";

// Thrown by the pinned connection layer when a socket would target a private IP.
export class PrivateIpError extends Error {
  constructor(hostname: string, address: string) {
    super(`refusing to connect: ${hostname} resolved to private address ${address}`);
    this.name = "PrivateIpError";
  }
}

// fetch wraps connector errors ("TypeError: fetch failed" with the real error as
// cause) — walk the cause chain to find our marker. Depth-capped to stay safe on cycles.
export function isPrivateIpError(err: unknown): boolean {
  let current = err;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (current.name === "PrivateIpError") return true;
    current = current.cause;
  }
  return false;
}

export type LookupFn = typeof dnsLookup;

// dns.lookup wrapper that rejects private results at connect time. Because this
// is the lookup the socket actually uses, the checked IP IS the connected IP —
// no TOCTOU window. Results pass through unchanged when all addresses are public.
export function makeGuardedLookup(base: LookupFn = dnsLookup): LookupFn {
  const guarded = (
    hostname: string,
    options: object,
    callback: (...args: unknown[]) => void,
  ) => {
    (base as unknown as typeof guarded)(hostname, options, (...args: unknown[]) => {
      const [err, result] = args;
      if (err) return callback(err);
      const addresses = Array.isArray(result)
        ? result.map((r) => (typeof r === "string" ? r : (r as { address: string }).address))
        : [result as string];
      const bad = addresses.find((a) => isPrivateIp(a));
      if (bad !== undefined) return callback(new PrivateIpError(hostname, bad));
      callback(...args);
    });
  };
  return guarded as unknown as LookupFn;
}

let pinnedAgent: Agent | undefined;

// Lazy singleton so importing this module allocates nothing (matches the
// lazy-import discipline elsewhere in src/lib/scrape).
export function getPinnedAgent(): Agent {
  if (!pinnedAgent) {
    pinnedAgent = new Agent({ connect: { lookup: makeGuardedLookup() } });
  }
  return pinnedAgent;
}
