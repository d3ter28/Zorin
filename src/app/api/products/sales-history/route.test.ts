import { beforeEach, describe, expect, it, vi } from "vitest";

const { importSalesHistory } = vi.hoisted(() => ({ importSalesHistory: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/salesHistory/importSalesHistory", () => ({ importSalesHistory }));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@priceiq.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";

function reqWithFile(csv: string, filename = "sales.csv"): Request {
  const form = new FormData();
  form.set("file", new File([csv], filename, { type: "text/csv" }));
  return { formData: async () => form } as unknown as Request;
}

function reqWithoutFile(): Request {
  const form = new FormData();
  return { formData: async () => form } as unknown as Request;
}

beforeEach(() => {
  importSalesHistory.mockReset();
});

describe("POST /api/products/sales-history", () => {
  it("parses the uploaded CSV, imports into the session merchant, and returns the summary", async () => {
    importSalesHistory.mockResolvedValue({ imported: 1, unknownSkus: [] });

    const res = await POST(reqWithFile("sku,date,units_sold,price\nTEE-100,2026-01-01,5,49.99"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      imported: 1,
      skipped: 0,
      errors: [],
      unknownSkus: [],
    });
    expect(importSalesHistory).toHaveBeenCalledOnce();
    expect(importSalesHistory.mock.calls[0][1]).toBe("m1");
  });

  it("returns 400 when no file field is present", async () => {
    const res = await POST(reqWithoutFile());
    expect(res.status).toBe(400);
    expect(importSalesHistory).not.toHaveBeenCalled();
  });

  it("returns 400 with the error list when the CSV has zero valid rows and has errors", async () => {
    const res = await POST(reqWithFile("sku,date,units_sold,price\nbad,row"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errors.length).toBeGreaterThan(0);
    expect(importSalesHistory).not.toHaveBeenCalled();
  });

  it("reports unknown SKUs from the import result", async () => {
    importSalesHistory.mockResolvedValue({ imported: 0, unknownSkus: ["GHOST-1"] });

    const res = await POST(reqWithFile("sku,date,units_sold,price\nGHOST-1,2026-01-01,5,49.99"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      imported: 0,
      skipped: 1,
      unknownSkus: ["GHOST-1"],
    });
  });
});
