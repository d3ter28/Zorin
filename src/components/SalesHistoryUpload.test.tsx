import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SalesHistoryUpload } from "./SalesHistoryUpload";
import { describe, it, expect, vi, afterEach } from "vitest";

function stubFetch(responseBody: object, ok = true) {
  const fetchMock = vi.fn(async () => ({
    ok,
    json: async () => responseBody,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function triggerUpload(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["sku,date,units_sold,price"], "sales.csv", { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("SalesHistoryUpload", () => {
  it("renders upload button and sample link", () => {
    render(<SalesHistoryUpload />);
    expect(screen.getByText(/Choose CSV file/i)).toBeDefined();
    expect(screen.getByText(/Download sample CSV/i)).toBeDefined();
  });

  it("shows ML summary when response includes fitted/recommended counts", async () => {
    stubFetch({
      imported: 10,
      skipped: 0,
      errors: [],
      unknownSkus: [],
      fitted: 3,
      recommended: 2,
      fitSkipped: ["Widget A"],
      recommendSkipped: [],
    });

    const { container } = render(<SalesHistoryUpload autoML />);
    triggerUpload(container);

    await waitFor(() => {
      expect(screen.getByText(/Fitted 3 models, generated 2 recommendations/i)).toBeDefined();
    });
    expect(screen.getByText(/1 product.*need more data/i)).toBeDefined();
  });

  it("shows recommendSkipped products needing COGS", async () => {
    stubFetch({
      imported: 5,
      skipped: 0,
      errors: [],
      unknownSkus: [],
      fitted: 2,
      recommended: 1,
      fitSkipped: [],
      recommendSkipped: ["Mug A", "Lamp B"],
    });

    const { container } = render(<SalesHistoryUpload autoML />);
    triggerUpload(container);

    await waitFor(() => {
      expect(screen.getByText(/2 products need COGS for recommendations/i)).toBeDefined();
    });
  });

  it("posts to autoML=true URL when autoML prop is true", async () => {
    const fetchMock = stubFetch({ imported: 5, skipped: 0, errors: [], unknownSkus: [] });

    const { container } = render(<SalesHistoryUpload autoML />);
    triggerUpload(container);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products/sales-history?autoML=true",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("posts to base URL when autoML prop is false", async () => {
    const fetchMock = stubFetch({ imported: 5, skipped: 0, errors: [], unknownSkus: [] });

    const { container } = render(<SalesHistoryUpload autoML={false} />);
    triggerUpload(container);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products/sales-history",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
