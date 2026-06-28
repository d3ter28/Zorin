import { HttpError } from "./errors";

/** Parse a request body as a JSON object, throwing a 400 on malformed input. */
export async function parseJsonBody(req: {
  json: () => Promise<unknown>;
}): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  if (body === null || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON body");
  }
  return body as Record<string, unknown>;
}

/**
 * Normalize a cost-of-goods value. `null` and `""` clear it; anything else must
 * be a finite, non-negative number. Throws a 400 otherwise.
 */
export function parseCogs(value: unknown): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new HttpError(400, "Invalid cogs");
  }
  return n;
}
