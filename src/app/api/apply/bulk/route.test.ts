import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyDecision } = vi.hoisted(() => ({ applyDecision: vi.fn() }));

vi.mock("@/lib/apply", () => ({ applyDecision }));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://test/api/apply/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  applyDecision.mockReset();
});

describe("POST /api/apply/bulk", () => {
  it("applies the changed products and counts holds as skipped", async () => {
    applyDecision
      .mockResolvedValueOnce({ found: true, applied: true, action: "raise", currentPrice: 2400 })
      .mockResolvedValueOnce({ found: true, applied: true, action: "lower", currentPrice: 1800 })
      .mockResolvedValueOnce({ found: true, applied: false, action: "hold", currentPrice: 5000 });

    const res = await POST(req({ productIds: ["a", "b", "c"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ applied: 2, skipped: 1 });
    expect(applyDecision).toHaveBeenCalledTimes(3);
  });

  it("counts unknown ids as skipped, not fatal", async () => {
    applyDecision.mockResolvedValue({
      found: false,
      applied: false,
      action: "",
      currentPrice: 0,
    });

    const res = await POST(req({ productIds: ["ghost"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ applied: 0, skipped: 1 });
  });

  it("is a no-op for an empty productIds array", async () => {
    const res = await POST(req({ productIds: [] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ applied: 0, skipped: 0 });
    expect(applyDecision).not.toHaveBeenCalled();
  });

  it("returns 400 when productIds is missing or not an array", async () => {
    const res = await POST(req({ nope: true }));
    expect(res.status).toBe(400);
    expect(applyDecision).not.toHaveBeenCalled();
  });

  it("returns 400 when productIds contains a non-string", async () => {
    const res = await POST(req({ productIds: ["ok", 7] }));
    expect(res.status).toBe(400);
    expect(applyDecision).not.toHaveBeenCalled();
  });
});
