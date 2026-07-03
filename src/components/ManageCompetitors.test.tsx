import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManageCompetitors } from "./ManageCompetitors";

const COMPETITORS = [
  {
    name: "MarketCo",
    price: 1499,
    url: "https://market.example/p/1",
    lastObservedAt: new Date().toISOString(),
    isStale: false,
  },
];

const reloadMock = vi.fn();

// jsdom's location.reload throws "Not implemented" — swap in a spy for the whole suite.
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

type Competitor = (typeof COMPETITORS)[number];

function renderPanel(competitors: Competitor[] = COMPETITORS) {
  return render(<ManageCompetitors productId="p1" competitors={competitors} />);
}

describe("ManageCompetitors refresh states", () => {
  it("idle: shows an enabled 'Refresh now' button", () => {
    renderPanel();
    const button = screen.getByRole("button", { name: "Refresh now" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("busy: disables the button and shows 'Refreshing…' while the request is pending", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never resolves
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    const button = screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("success: reloads the page", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/products/p1/refresh", { method: "POST" });
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("network error: shows the alert and re-enables the button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole("alert").textContent).toBe("Couldn't refresh prices — try again.");
    const button = screen.getByRole("button", { name: "Refresh now" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("non-ok response: shows the alert and re-enables the button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as Response));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole("alert").textContent).toBe("Couldn't refresh prices — try again.");
    const button = screen.getByRole("button", { name: "Refresh now" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("retry: clears the previous error while the new request is pending", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => new Promise(() => {})); // second click hangs
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.queryByRole("alert")).toBeNull();
    const busy = screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });
});

const HOUR_MS = 60 * 60 * 1000;

// 2h ago lands mid-bucket in relativeTime, so the label can't flip during the test run.
function competitor(overrides: Partial<Competitor> = {}): Competitor {
  return {
    name: "MarketCo",
    price: 1499,
    url: "https://market.example/p/1",
    lastObservedAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
    isStale: false,
    ...overrides,
  };
}

describe("ManageCompetitors status lines", () => {
  it("empty: shows the import hint and no list", () => {
    renderPanel([]);
    expect(
      screen.getByText("No competitor prices yet. Import a CSV from the dashboard."),
    ).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("fresh competitor: shows a 'confirmed 2h ago' line", () => {
    renderPanel([competitor()]);
    expect(screen.getByText("confirmed 2h ago")).toBeTruthy();
  });

  it("stale competitor: shows the stale warning instead of a confirmed line", () => {
    renderPanel([competitor({ isStale: true })]);
    expect(screen.getByText("⚠ stale")).toBeTruthy();
    expect(screen.queryByText(/confirmed/)).toBeNull();
  });

  it("URL-less competitor: shows the auto-refresh hint", () => {
    renderPanel([competitor({ url: "" })]);
    expect(
      screen.getByText(/no URL — add one via CSV to enable auto-refresh/),
    ).toBeTruthy();
  });

  it("URL-bearing competitor: no auto-refresh hint", () => {
    renderPanel([competitor()]);
    expect(screen.queryByText(/no URL/)).toBeNull();
  });
});
