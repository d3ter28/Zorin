import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverCompetitors } from "./DiscoverCompetitors";

const reloadMock = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: reloadMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  reloadMock.mockReset();
});

function stubApi(response: object | null, status = 200) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const CANDIDATES = [
  {
    url: "https://rival.example/product/1",
    domain: "rival.example",
    title: "Rival Widget",
    priceCents: 1999,
  },
  {
    url: "https://other.example/product/2",
    domain: "other.example",
    title: "Other Widget",
    priceCents: 2099,
  },
];

function renderPanel() {
  return render(
    <DiscoverCompetitors productId="p1" currentPriceCents={2000} />,
  );
}

describe("DiscoverCompetitors", () => {
  it("idle: renders 'Find competitors' button", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Find competitors" })).toBeTruthy();
  });

  it("posts to discover endpoint with mode 'both' when button clicked", async () => {
    const fetchMock = stubApi({ candidates: [], skipped: [] });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/p1/discover",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ mode: "both" }),
      }),
    );
  });

  it("shows review state with candidates after successful search", async () => {
    stubApi({ candidates: CANDIDATES, skipped: [] });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));
    expect(screen.getByRole("button", { name: "Add selected" })).toBeTruthy();
    expect(screen.getByText("rival.example")).toBeTruthy();
    expect(screen.getByText("other.example")).toBeTruthy();
  });

  it("'Add selected' posts selected candidates to competitors endpoint and reloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ candidates: CANDIDATES, skipped: [] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));
    await userEvent.click(screen.getByRole("button", { name: "Add selected" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/p1/competitors",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          candidates: CANDIDATES.map((c) => ({
            url: c.url,
            competitorName: c.domain,
            priceCents: c.priceCents,
          })),
        }),
      }),
    );
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("unchecking a candidate removes it from the confirm payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ candidates: CANDIDATES, skipped: [] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));

    // Uncheck the first candidate
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);

    await userEvent.click(screen.getByRole("button", { name: "Add selected" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products/p1/competitors",
      expect.objectContaining({
        body: JSON.stringify({
          candidates: [
            {
              url: CANDIDATES[1].url,
              competitorName: CANDIDATES[1].domain,
              priceCents: CANDIDATES[1].priceCents,
            },
          ],
        }),
      }),
    );
  });

  it("shows empty state when no candidates returned", async () => {
    stubApi({ candidates: [], skipped: [] });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));
    expect(
      screen.getByText("No competitors found with a confirmed price."),
    ).toBeTruthy();
  });

  it("shows providerError message when response has providerError", async () => {
    stubApi({ providerError: true, candidates: [] });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));
    expect(screen.getByText("Search failed — try again.")).toBeTruthy();
  });

  it("shows no-provider hint when discover returns 503", async () => {
    stubApi(null, 503);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Find competitors" }));
    expect(
      screen.getByText(
        "Competitor discovery requires a search API key (BRAVE_SEARCH_API_KEY).",
      ),
    ).toBeTruthy();
  });
});
