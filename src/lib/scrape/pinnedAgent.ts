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
