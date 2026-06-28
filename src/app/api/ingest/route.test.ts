import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyIngest } = vi.hoisted(() => ({ applyIngest: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/ingest/applyIngest", () => ({ applyIngest }));

import { POST } from "./route";

const req = (body: string) => ({ text: async () => body }) as unknown as Request;

beforeEach(() => applyIngest.mockReset());

describe("POST /api/ingest", () => {
  it("parses the body, applies ingest, and returns the summary", async () => {
    applyIngest.mockResolvedValue({ inserted: 1, updated: 1, skipped: 0, errors: [] });
    const res = await POST(req("TEE-001,RivalShop,28.50"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ inserted: 1, updated: 1 });
    expect(applyIngest).toHaveBeenCalledOnce();
  });

  it("returns 400 for an empty body", async () => {
    const res = await POST(req("   "));
    expect(res.status).toBe(400);
    expect(applyIngest).not.toHaveBeenCalled();
  });
});
