import { NextResponse } from "next/server";

/**
 * An error carrying an intended HTTP status. Throw it from a route handler (or a
 * validation helper) to return a clean, client-safe response instead of a 500.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function isPrismaNotFound(err: unknown): boolean {
  // Prisma throws PrismaClientKnownRequestError with code "P2025" when an
  // update/delete targets a record that does not exist. Duck-type the code so
  // this module doesn't need to import the generated Prisma client.
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2025"
  );
}

/** Convert any thrown value into a safe NextResponse. Never leaks stack traces. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (isPrismaNotFound(err)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Unexpected: log server-side, return an opaque message to the client.
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Wrap a route handler so any thrown error becomes a safe response. Preserves
 * the handler's (req, ctx) signature used by the Next.js App Router.
 */
export function withErrorHandling<Ctx = unknown>(
  handler: (req: Request, ctx: Ctx) => Promise<NextResponse>,
): (req: Request, ctx?: Ctx) => Promise<NextResponse> {
  // `ctx` is optional on the returned wrapper: routes with dynamic segments
  // receive it from Next.js (and tests pass it explicitly), while context-less
  // routes can be invoked with just the request.
  return async (req, ctx) => {
    try {
      return await handler(req, ctx as Ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
