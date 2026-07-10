import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductsTable } from "./ProductsTable";

// Two "hold" rows: no checkboxes rendered, no apply bar — keeps DOM focused on refresh UI.
const ROWS = [
  {
    id: "p1",
    title: "Ceramic Mug",
    sku: "MUG-008",
    currentPrice: 1500,
    cogs: 600,
    category: "kitchen",
    estUnits: 100,
    margin: 0.6,
    comparison: { compMedian: 1400, pctVsMedian: 0.07, competitorCount: 3 },
    recommendedAction: "hold" as const,
    suggestedPrice: 1500,
  },
  {
    id: "p2",
    title: "Steel Bottle",
    sku: "BTL-002",
    currentPrice: 2200,
    cogs: 900,
    category: "kitchen",
    estUnits: 50,
    margin: 0.59,
    comparison: { compMedian: 2250, pctVsMedian: -0.02, competitorCount: 2 },
    recommendedAction: "hold" as const,
    suggestedPrice: 2200,
  },
];

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

interface ApiHandlers {
  onProducts?: () => Promise<Response>;
  onRefresh?: () => Promise<Response>;
  onApply?: () => Promise<Response>;
}

// Routes the three endpoints ProductsTable calls; unhandled URLs fail loudly.
function stubApi(handlers: ApiHandlers = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/products") {
      return (handlers.onProducts ?? (async () => json(ROWS)))();
    }
    if (url === "/api/refresh" && init?.method === "POST") {
      return (handlers.onRefresh ?? (async () => json({ refreshed: 0, failed: 0 })))();
    }
    if (url === "/api/products/bulk-apply" && init?.method === "POST") {
      return (handlers.onApply ?? (async () => json({ applied: 0, failed: [] })))();
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Kept so the refresh-states tests read unchanged.
function stubFetch(onRefresh: () => Promise<Response>) {
  return stubApi({ onRefresh });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderLoaded() {
  render(<ProductsTable refreshToken={0} />);
  // Wait out the loading skeleton — table appears once GET /api/products resolves.
  return await screen.findByRole("button", { name: "Refresh all prices" });
}

describe("ProductsTable refresh states", () => {
  it("renders the table with an enabled refresh button after load", async () => {
    stubFetch(async () => json({ refreshed: 0, failed: 0 }));
    const button = await renderLoaded();
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Ceramic Mug")).toBeTruthy();
  });

  it("busy: disables the button and shows 'Refreshing…' while the POST is pending", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const button = await renderLoaded();
    await userEvent.click(button);
    const busy = screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });

  it("success: shows plural summary and re-fetches the table", async () => {
    const fetchMock = stubFetch(async () => json({ refreshed: 2, failed: 0 }));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Refreshed 2 prices.");
    const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
    expect(productLoads.length).toBe(2); // initial load + post-refresh reload
  });

  it("success with failures: includes the failed count", async () => {
    stubFetch(async () => json({ refreshed: 1, failed: 1 }));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Refreshed 1 price, 1 failed.");
  });

  it("singular: shows 'Refreshed 1 price.' without pluralizing", async () => {
    stubFetch(async () => json({ refreshed: 1, failed: 0 }));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Refreshed 1 price.");
  });

  it("failure: shows the error message and re-enables the button", async () => {
    stubFetch(async () => json({}, false));
    const button = await renderLoaded();
    await userEvent.click(button);
    await screen.findByText("Couldn't refresh prices — try again.");
    await waitFor(() => {
      const b = screen.getByRole("button", { name: "Refresh all prices" }) as HTMLButtonElement;
      expect(b.disabled).toBe(false);
    });
  });
});

describe("ProductsTable load states", () => {
  it("loading: shows no table or refresh button while the fetch is pending", () => {
    stubApi({ onProducts: () => new Promise(() => {}) }); // never resolves
    render(<ProductsTable refreshToken={0} />);
    expect(screen.queryByRole("button", { name: "Refresh all prices" })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("load error: shows the message, and Retry re-fetches and renders the table", async () => {
    const onProducts = vi
      .fn()
      .mockResolvedValueOnce(json([], false)) // first load fails
      .mockResolvedValue(json(ROWS)); // retry succeeds
    stubApi({ onProducts });
    render(<ProductsTable refreshToken={0} />);
    await screen.findByText("Couldn't load products.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Refresh all prices" });
    expect(screen.getByText("Ceramic Mug")).toBeTruthy();
    expect(onProducts).toHaveBeenCalledTimes(2);
  });

  it("empty: shows the 'No products yet' state and no refresh button", async () => {
    stubApi({ onProducts: async () => json([]) });
    render(<ProductsTable refreshToken={0} />);
    await screen.findByText("No products yet");
    expect(screen.queryByRole("button", { name: "Refresh all prices" })).toBeNull();
  });
});

// p1/p2 actionable (pre-selected on load), p3 hold (no checkbox).
const ACTIONABLE_ROWS = [
  { ...ROWS[0], recommendedAction: "raise" as const, suggestedPrice: 1600 },
  { ...ROWS[1], recommendedAction: "lower" as const, suggestedPrice: 2100 },
  {
    id: "p3",
    title: "Desk Lamp",
    sku: "LMP-001",
    currentPrice: 3500,
    cogs: 1400,
    category: "office",
    estUnits: 20,
    margin: 0.6,
    comparison: { compMedian: 3450, pctVsMedian: 0.01, competitorCount: 2 },
    recommendedAction: "hold" as const,
    suggestedPrice: 3500,
  },
];

async function renderActionable(handlers: ApiHandlers = {}) {
  const fetchMock = stubApi({ onProducts: async () => json(ACTIONABLE_ROWS), ...handlers });
  render(<ProductsTable refreshToken={0} />);
  await screen.findByRole("button", { name: "Refresh all prices" });
  return fetchMock;
}

describe("ProductsTable selection and apply", () => {
  it("renders checkboxes for actionable rows only", async () => {
    await renderActionable();
    expect(screen.getByRole("checkbox", { name: "Select Ceramic Mug" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Steel Bottle" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Select Desk Lamp" })).toBeNull();
  });

  it("pre-selects actionable rows and shows the apply bar", async () => {
    await renderActionable();
    expect(screen.getByText("2 changes selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 2 changes" })).toBeTruthy();
  });

  it("toggling checkboxes updates the count; deselecting all hides the bar", async () => {
    await renderActionable();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Ceramic Mug" }));
    expect(screen.getByText("1 change selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply 1 change" })).toBeTruthy();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Steel Bottle" }));
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Apply / })).toBeNull();
  });

  it("busy: shows 'Applying…' disabled while the POST is pending", async () => {
    await renderActionable({ onApply: () => new Promise(() => {}) });
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    const busy = screen.getByRole("button", { name: "Applying…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });

  it("success: POSTs the selected ids and re-fetches the table", async () => {
    const fetchMock = await renderActionable({ onApply: async () => json({ applied: 2, failed: [] }) });
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    await waitFor(() => {
      const productLoads = fetchMock.mock.calls.filter(([u]) => String(u) === "/api/products");
      expect(productLoads.length).toBe(2); // initial load + post-apply reload
    });
    const applyCall = fetchMock.mock.calls.find(([u]) => String(u) === "/api/products/bulk-apply");
    expect(applyCall).toBeTruthy();
    expect(JSON.parse(String(applyCall![1]?.body))).toEqual({ productIds: ["p1", "p2"] });
  });

  it("failure: shows the apply error in the bar and re-enables the button", async () => {
    await renderActionable({ onApply: async () => json({}, false) });
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    await screen.findByText("Couldn't apply changes — try again.");
    const button = screen.getByRole("button", { name: "Apply 2 changes" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
