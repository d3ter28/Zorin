import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IngestUpload } from "./IngestUpload";

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

const CSV = new File(["sku,competitor_name,price\nMUG-001,Shop,14.99"], "competitors.csv", { type: "text/csv" });

function renderUpload() {
  const onIngested = vi.fn();
  render(<IngestUpload onIngested={onIngested} />);
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  return { onIngested, fileInput };
}

describe("IngestUpload", () => {
  it("idle: shows heading and Choose CSV label", () => {
    stubFetch();
    renderUpload();
    expect(screen.getByText("Import competitor prices")).toBeTruthy();
    expect(screen.getByText("Choose CSV")).toBeTruthy();
  });

  it("busy: label reads 'Uploading…' and file input is disabled", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    expect(screen.getByText("Uploading…")).toBeTruthy();
    expect(fileInput.disabled).toBe(true);
  });

  it("success: shows summary counts and calls onIngested", async () => {
    stubFetch(async () => json({ inserted: 3, updated: 0, skipped: 1, errors: [] }));
    const { fileInput, onIngested } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("3 inserted")).toBeTruthy());
    expect(screen.getByText("0 updated")).toBeTruthy();
    expect(screen.getByText("1 skipped")).toBeTruthy();
    expect(onIngested).toHaveBeenCalledTimes(1);
  });

  it("row errors: shows error list items", async () => {
    stubFetch(async () =>
      json({ inserted: 0, updated: 0, skipped: 0, errors: [{ line: 2, reason: "price must be positive" }] }),
    );
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Line 2: price must be positive")).toBeTruthy());
  });

  it("server error with body: shows the error message from the response", async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({ error: "Upload failed — check the file format." }) }) as Response);
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Upload failed — check the file format.")).toBeTruthy());
  });

  it("network failure: shows generic fallback message", async () => {
    stubFetch(() => Promise.reject("something"));
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("Upload failed — try again.")).toBeTruthy());
  });

  it("after success the file input is re-enabled (not frozen)", async () => {
    stubFetch();
    const { fileInput } = renderUpload();
    await userEvent.upload(fileInput, CSV);
    await waitFor(() => expect(screen.getByText("1 inserted")).toBeTruthy());
    expect(fileInput.disabled).toBe(false);
  });
});
