import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignBuilder } from "./CampaignBuilder";

// Mock next/navigation so useRouter doesn't blow up in jsdom
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const PRODUCTS = [
  {
    id: "p1",
    title: "Ceramic Mug",
    sku: "MUG-008",
    currentPrice: 1500,
    cogs: 600,
    category: "kitchen",
    estUnits: 100,
    imageUrl: null,
    margin: 0.4,
    recommendedAction: "raise" as const,
    suggestedPrice: 1600,
    modelHealth: null,
    comparison: null,
  },
];

const PREVIEW = {
  totalProducts: 1,
  changing: 1,
  skipped: 0,
  skipReasons: {},
  clampedByMarginFloor: 0,
  avgChangePct: -10,
  products: [
    {
      productId: "p1",
      title: "Ceramic Mug",
      sku: "MUG-008",
      currentPriceCents: 1500,
      targetPriceCents: 1350,
      changePct: -10,
      marginPct: null,
      clampedByMarginFloor: false,
      skipped: false,
      skipReason: null,
    },
  ],
};

// Returns a fetch stub that routes by URL substring
function makeFetchStub(routes: Record<string, unknown>) {
  return vi.fn(async (url: string | URL) => {
    const urlStr = url.toString();
    for (const [pattern, data] of Object.entries(routes)) {
      if (urlStr.includes(pattern)) {
        return { ok: true, status: 200, json: async () => data } as Response;
      }
    }
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── Step navigation ──────────────────────────────────────────────────────────

describe("CampaignBuilder step navigation", () => {
  it("starts on step 1 and shows the campaign name field", () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    expect(screen.getByLabelText(/Campaign name/i)).toBeTruthy();
  });

  it("Next is disabled when campaign name is empty", () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    const nextBtn = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it("filling the name enables Next and clicking it advances to step 2", async () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    await userEvent.type(screen.getByLabelText(/Campaign name/i), "Summer Sale");
    const nextBtn = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(false);
    await userEvent.click(nextBtn);
    await screen.findByText("Select Products");
  });

  it("step 2 shows the ProductPicker with a product count badge", async () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    await userEvent.type(screen.getByLabelText(/Campaign name/i), "Summer Sale");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Select Products");
    // ProductPicker renders with count badge once products load
    await screen.findByText(/products selected/i);
  });

  it("Back from step 2 returns to step 1", async () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    await userEvent.type(screen.getByLabelText(/Campaign name/i), "Summer Sale");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Select Products");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/Campaign name/i)).toBeTruthy();
  });

  it("Next is disabled on step 2 when no products are selected", async () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    await userEvent.type(screen.getByLabelText(/Campaign name/i), "Summer Sale");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Select Products");
    // No products selected yet — Next should be disabled
    const nextBtn = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });
});

// ── Type toggle defaults ─────────────────────────────────────────────────────

describe("CampaignBuilder type toggle defaults", () => {
  it("sale type (default) has revertOnEnd checked", () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    const cb = screen.getByRole("checkbox", { name: /Revert prices on end/i }) as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  it("switching to ML Recommendation unchecks revertOnEnd", async () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    await userEvent.click(screen.getByRole("button", { name: "ML Recommendation" }));
    const cb = screen.getByRole("checkbox", { name: /Revert prices on end/i }) as HTMLInputElement;
    expect(cb.checked).toBe(false);
  });

  it("switching back to Sale re-checks revertOnEnd", async () => {
    vi.stubGlobal("fetch", makeFetchStub({ "/api/products": PRODUCTS }));
    render(<CampaignBuilder />);
    await userEvent.click(screen.getByRole("button", { name: "ML Recommendation" }));
    await userEvent.click(screen.getByRole("button", { name: "Sale" }));
    const cb = screen.getByRole("checkbox", { name: /Revert prices on end/i }) as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });
});

// ── Step 3 preview fetch ─────────────────────────────────────────────────────

describe("CampaignBuilder step 3 preview", () => {
  it("entering step 3 triggers a POST to /api/campaigns/preview", async () => {
    const fetchMock = makeFetchStub({
      "/api/products": PRODUCTS,
      "/api/campaigns/preview": PREVIEW,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignBuilder />);

    // Step 1 → fill name
    await userEvent.type(screen.getByLabelText(/Campaign name/i), "My Campaign");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 2 → wait for products, select one so Next is enabled
    const selectAllBtn = await screen.findByRole("button", { name: "Select all" });
    await userEvent.click(selectAllBtn);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 3 header appears
    await screen.findByText("Preview & Schedule");

    // Preview fetch should have been called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/campaigns/preview"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("step 3 shows summary stats after preview loads", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchStub({
        "/api/products": PRODUCTS,
        "/api/campaigns/preview": PREVIEW,
      }),
    );

    render(<CampaignBuilder />);
    await userEvent.type(screen.getByLabelText(/Campaign name/i), "My Campaign");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    const selectAllBtn = await screen.findByRole("button", { name: "Select all" });
    await userEvent.click(selectAllBtn);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    // Summary stat cards appear
    await screen.findByText("Changing");
    expect(screen.getByText("Skipped")).toBeTruthy();
  });
});
