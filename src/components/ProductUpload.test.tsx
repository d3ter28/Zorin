import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductUpload } from "./ProductUpload";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

function stubFetch(impl: () => Promise<Response> = async () => json({ inserted: 1, updated: 0, skipped: 0, errors: [] })) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const CSV = new File(["sku,title\nMUG-001,Mug"], "products.csv", { type: "text/csv" });

function renderUpload() {
  const onImported = vi.fn();
  render(<ProductUpload onImported={onImported} />);
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  return { onImported, fileInput };
}

describe("ProductUpload", () => {
  it("idle: shows heading and Choose CSV label", () => {
    stubFetch();
    renderUpload();
    expect(screen.getByText("Import product catalog")).toBeTruthy();
    expect(screen.getByText("Choose CSV")).toBeTruthy();
  });

  it("busy: label reads 'Importing…' and file input is disabled", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    expect(screen.getByText("Importing…")).toBeTruthy();
    expect(fileInput.disabled).toBe(true);
  });

  it("success: shows summary counts and calls onImported", async () => {
    stubFetch(async () => json({ inserted: 2, updated: 1, skipped: 0, errors: [] }));
    const { fileInput, onImported } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("2 added")).toBeTruthy());
    expect(screen.getByText("1 updated")).toBeTruthy();
    expect(screen.getByText("0 skipped")).toBeTruthy();
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it("row errors: shows error list items", async () => {
    stubFetch(async () =>
      json({ inserted: 0, updated: 0, skipped: 0, errors: [{ line: 3, reason: "unknown SKU" }] }),
    );
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Line 3: unknown SKU")).toBeTruthy());
  });

  it("server error with body: shows the error message from the response", async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({ error: "Bad header row" }) }) as Response);
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Bad header row")).toBeTruthy());
  });

  it("network failure: shows generic fallback message", async () => {
    stubFetch(() => Promise.reject("something"));
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Import failed — try again.")).toBeTruthy());
  });

  it("after success the file input is re-enabled (not frozen)", async () => {
    stubFetch();
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("1 added")).toBeTruthy());
    expect(fileInput.disabled).toBe(false);
  });
});
