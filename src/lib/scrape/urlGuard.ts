import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

// Returns true for any IP that must not be fetched (loopback, RFC1918, link-local, ULA, CGNAT).
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) return isPrivateV6(ip);
  return true; // not a valid IP — treat as unsafe
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  return false;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) — judge the embedded IPv4
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  // hex form: ::ffff:xxxx:xxxx (each group is 16 bits)
  const hexMapped = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const hi = parseInt(hexMapped[1], 16);
    const lo = parseInt(hexMapped[2], 16);
    const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateV4(dotted);
  }
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  return false;
}

export interface GuardDeps {
  /** DNS resolution seam — injectable so tests never hit real DNS. */
  lookup: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "scheme" | "private_ip" | "dns" };

const defaultDeps: GuardDeps = {
  lookup: (hostname) => dnsLookup(hostname, { all: true }),
};

/**
 * SSRF guard for merchant-supplied scrape URLs. Rejects non-http(s) schemes,
 * private/loopback/link-local/metadata IP literals, and hostnames any of whose
 * DNS records resolve to such an IP. `allowPrivate` skips only the IP checks
 * (never the scheme check) — used in development so the localhost demo works.
 *
 * // DNS-rebinding TOCTOU window is an accepted risk for single-tenant MVP.
 * // Scheme check applies even in demo mode.
 */
export async function validateScrapeUrl(
  url: string,
  opts: { deps?: GuardDeps; allowPrivate?: boolean } = {},
): Promise<GuardResult> {
  const { deps = defaultDeps, allowPrivate = false } = opts;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "scheme" };
  }
  if (allowPrivate) return { ok: true };

  // URL brackets IPv6 hosts: [::1] — strip for isIP/classification.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host) !== 0) {
    return isPrivateIp(host) ? { ok: false, reason: "private_ip" } : { ok: true };
  }

  let records: Array<{ address: string }>;
  try {
    records = await deps.lookup(host);
  } catch {
    return { ok: false, reason: "dns" };
  }
  if (records.length === 0) return { ok: false, reason: "dns" };
  if (records.some((r) => isPrivateIp(r.address))) {
    return { ok: false, reason: "private_ip" };
  }
  return { ok: true };
}
