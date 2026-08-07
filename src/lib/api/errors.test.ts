import { describe, expect, it } from "vitest";
import { HttpError, toErrorResponse, withErrorHandling } from "./errors";

describe("toErrorResponse", () => {
  it("maps an HttpError to its status and message", async () => {
    const res = toErrorResponse(new HttpError(400, "Invalid cogs"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid cogs" });
  });

  it("maps a Prisma P2025 (record not found) to 404", async () => {
    const res = toErrorResponse({ code: "P2025", message: "Record not found" });
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });

  it("maps a Prisma P2002 (unique constraint violation) to 409", async () => {
    const res = toErrorResponse({ code: "P2002", message: "Unique constraint failed" });
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "This resource already exists" });
  });

  it("maps an unknown error to a 500 without leaking details", async () => {
    const res = toErrorResponse(new Error("connection string was sk-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(body)).not.toMatch(/secret/);
  });
});

describe("withErrorHandling", () => {
  it("returns the handler's response when it succeeds", async () => {
    const handler = withErrorHandling(async () =>
      toErrorResponse(new HttpError(200 as number, "ok")),
    );
    const res = await handler({} as never, {} as never);
    expect(res.status).toBe(200);
  });

  it("catches a thrown HttpError and maps it", async () => {
    const handler = withErrorHandling(async () => {
      throw new HttpError(404, "Not found");
    });
    const res = await handler({} as never, {} as never);
    expect(res.status).toBe(404);
  });

  it("catches an unexpected throw and returns 500", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("boom");
    });
    const res = await handler({} as never, {} as never);
    expect(res.status).toBe(500);
  });
});
