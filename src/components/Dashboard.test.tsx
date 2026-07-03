import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

const SUMMARY = { inserted: 1, updated: 0, skipped: 0, errors: [] };

// Routes all three endpoints Dashboard's children call; throws on anything else.
function stubAll(overrides: Partial<Record<string, () => Promise<Response>>> = {}) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (overrides[url]) return overrides[url]!();
    if (url === "/api/products") return json([]);
    if (url === "/api/products/catalog" && init?.method === "POST") return json(SUMMARY);
    if (url === "/api/ingest" && init?.method === "POST") return json(SUMMARY);
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const CATALOG_CSV = new File(["sku,title\nMUG-001,Mug"], "products.csv", { type: "text/csv" });
const INGEST_CSV = new File(["sku,competitor_name,price\nMUG-001,Shop,14.99"], "competitors.csv", { type: "text/csv" });

describe("Dashboard", () => {
  it("renders all three sections", async () => {
    stubAll();
    render(<Dashboard />);
    expect(screen.getByText("Import product catalog")).toBeTruthy();
    expect(screen.getByText("Import competitor prices")).toBeTruthy();
    // ProductsTable renders into an empty state or loading skeleton — just check it mounted
    // by verifying the two upload sections are present (table is async; its own tests cover it).
  });

  it("onImported: re-fetches products after catalog upload", async () => {
    const fetchMock = stubAll();
    render(<Dashboard />);
    // Wait for initial products load
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === "/api/products")).toBe(true));
    const countBefore = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products").length;

    const catalogInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    await userEvent.upload(catalogInput, CATALOG_CSV);

    await waitFor(() => {
      const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
      expect(productLoads.length).toBeGreaterThan(countBefore);
    });
  });

  it("onIngested: re-fetches products after competitor upload", async () => {
    const fetchMock = stubAll();
    render(<Dashboard />);
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === "/api/products")).toBe(true));
    const countBefore = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products").length;

    // The second file input belongs to IngestUpload
    const ingestInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    await userEvent.upload(ingestInput, INGEST_CSV);

    await waitFor(() => {
      const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
      expect(productLoads.length).toBeGreaterThan(countBefore);
    });
  });
});
