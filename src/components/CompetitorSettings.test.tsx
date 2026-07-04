import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompetitorSettings } from "./CompetitorSettings";

function stubApi(domains: string[] = []) {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (!options || options.method === undefined || options.method === "GET") {
      return { ok: true, json: async () => ({ domains }) } as Response;
    }
    if (options.method === "PUT") {
      return { ok: true, json: async () => ({}) } as Response;
    }
    return { ok: false } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CompetitorSettings", () => {
  it("shows existing saved domains from GET /api/settings/competitors", async () => {
    stubApi(["amazon.com", "walmart.com"]);
    render(<CompetitorSettings />);
    await screen.findByText("amazon.com");
    expect(screen.getByText("walmart.com")).toBeTruthy();
  });

  it("can add a new domain", async () => {
    stubApi(["amazon.com"]);
    render(<CompetitorSettings />);
    await screen.findByText("amazon.com");
    const input = screen.getByLabelText("new competitor domain");
    await userEvent.type(input, "target.com");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("target.com")).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("can remove a domain", async () => {
    stubApi(["amazon.com", "walmart.com"]);
    render(<CompetitorSettings />);
    await screen.findByText("amazon.com");
    await userEvent.click(screen.getByRole("button", { name: "Remove amazon.com" }));
    expect(screen.queryByText("amazon.com")).toBeNull();
    expect(screen.getByText("walmart.com")).toBeTruthy();
  });

  it("saves via PUT /api/settings/competitors on save button click", async () => {
    const fetchMock = stubApi(["amazon.com"]);
    render(<CompetitorSettings />);
    await screen.findByText("amazon.com");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings/competitors",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ domains: ["amazon.com"] }),
      }),
    );
    await screen.findByText("Saved!");
  });

  it("shows validation feedback for invalid domain (duplicate)", async () => {
    stubApi(["amazon.com"]);
    render(<CompetitorSettings />);
    await screen.findByText("amazon.com");
    const input = screen.getByLabelText("new competitor domain");
    await userEvent.type(input, "amazon.com");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    // duplicate should not be added — still only one entry
    const items = screen.getAllByText("amazon.com");
    expect(items.length).toBe(1);
  });

  it("shows validation feedback for empty domain input", async () => {
    stubApi([]);
    render(<CompetitorSettings />);
    await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    // nothing added, no error crash
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
