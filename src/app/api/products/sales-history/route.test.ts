import { beforeEach, describe, expect, it, vi } from "vitest";

const { importSalesHistory } = vi.hoisted(() => ({ importSalesHistory: vi.fn() }));
const { runBulkML } = vi.hoisted(() => ({ runBulkML: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {},
}));
vi.mock("@/lib/salesHistory/importSalesHistory", () => ({ importSalesHistory }));
vi.mock("@/lib/salesHistory/bulkML", () => ({ runBulkML }));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSessionApi: vi.fn(async () => ({
    merchantId: "m1",
    user: { id: "u1", email: "demo@zorin.example", merchantId: "m1" },
  })),
}));

import { POST } from "./route";

function reqWithFile(csv: string, filename = "sales.csv", searchParams = ""): Request {
  const form = new FormData();
  form.set("file", new File([csv], filename, { type: "text/csv" }));
  return {
    formData: async () => form,
    url: `http://localhost/api/products/sales-history${searchParams}`,
  } as unknown as Request;
}

function reqWithoutFile(): Request {
  const form = new FormData();
  return {
    formData: async () => form,
    url: "http://localhost/api/products/sales-history",
  } as unknown as Request;
}

beforeEach(() => {
  importSalesHistory.mockReset();
  runBulkML.mockReset();
});

describe("POST /api/products/sales-history", () => {
  it("parses the uploaded CSV, imports into the session merchant, and returns the summary", async () => {
    importSalesHistory.mockResolvedValue({ imported: 1, unknownSkus: [], importedProductIds: ["p1"] });

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
    importSalesHistory.mockResolvedValue({ imported: 0, unknownSkus: ["GHOST-1"], importedProductIds: [] });

    const res = await POST(reqWithFile("sku,date,units_sold,price\nGHOST-1,2026-01-01,5,49.99"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      imported: 0,
      skipped: 1,
      unknownSkus: ["GHOST-1"],
    });
  });

  it("calls runBulkML and returns ML fields when autoML=true and products were imported", async () => {
    importSalesHistory.mockResolvedValue({ imported: 2, unknownSkus: [], importedProductIds: ["p1", "p2"] });
    runBulkML.mockResolvedValue({ fitted: 2, recommended: 1, fitSkipped: [], recommendSkipped: ["Widget B"] });

    const res = await POST(reqWithFile("sku,date,units_sold,price\nTEE-100,2026-01-01,5,49.99", "sales.csv", "?autoML=true"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fitted).toBe(2);
    expect(body.recommended).toBe(1);
    expect(body.fitSkipped).toEqual([]);
    expect(body.recommendSkipped).toEqual(["Widget B"]);
    expect(runBulkML).toHaveBeenCalledOnce();
    expect(runBulkML.mock.calls[0][1]).toEqual(["p1", "p2"]);
  });

  it("does NOT call runBulkML and response has no ML fields when autoML param is absent", async () => {
    importSalesHistory.mockResolvedValue({ imported: 1, unknownSkus: [], importedProductIds: ["p1"] });

    const res = await POST(reqWithFile("sku,date,units_sold,price\nTEE-100,2026-01-01,5,49.99"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty("fitted");
    expect(runBulkML).not.toHaveBeenCalled();
  });

  it("does NOT call runBulkML when autoML=true but all SKUs were unknown (no imported product IDs)", async () => {
    importSalesHistory.mockResolvedValue({ imported: 0, unknownSkus: ["GHOST-1"], importedProductIds: [] });

    const res = await POST(reqWithFile("sku,date,units_sold,price\nGHOST-1,2026-01-01,5,49.99", "sales.csv", "?autoML=true"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty("fitted");
    expect(runBulkML).not.toHaveBeenCalled();
  });
});
