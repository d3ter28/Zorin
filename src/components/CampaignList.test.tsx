import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignList } from "./CampaignList";

const CAMPAIGNS = [
  {
    id: "c1",
    merchantId: "m1",
    name: "Summer Sale",
    type: "sale",
    status: "active",
    rules: "{}",
    revertOnEnd: true,
    startsAt: "2026-07-01T00:00:00Z",
    endsAt: "2026-08-31T00:00:00Z",
    executionCursor: 0,
    executedAt: null,
    revertedAt: null,
    createdAt: "2026-06-01T00:00:00Z",
    _count: { products: 5 },
  },
  {
    id: "c2",
    merchantId: "m1",
    name: "Black Friday Prep",
    type: "ml_recommendation",
    status: "scheduled",
    rules: "{}",
    revertOnEnd: false,
    startsAt: "2026-11-01T00:00:00Z",
    endsAt: "2026-11-30T00:00:00Z",
    executionCursor: 0,
    executedAt: null,
    revertedAt: null,
    createdAt: "2026-06-15T00:00:00Z",
    _count: { products: 12 },
  },
  {
    id: "c3",
    merchantId: "m1",
    name: "Flash Draft",
    type: "sale",
    status: "draft",
    rules: "{}",
    revertOnEnd: true,
    startsAt: null,
    endsAt: null,
    executionCursor: 0,
    executedAt: null,
    revertedAt: null,
    createdAt: "2026-08-01T00:00:00Z",
    _count: { products: 0 },
  },
];

function stubFetch(data: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, json: async () => data }) as Response),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Renders and waits for the loading state to finish (tabs appear after load).
async function renderLoaded() {
  render(<CampaignList />);
  await screen.findByRole("button", { name: /^All/ });
}

describe("CampaignList filter tabs", () => {
  it("All tab shows all campaigns by default", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    expect(screen.getByRole("link", { name: /Summer Sale/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Black Friday Prep/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Flash Draft/ })).toBeTruthy();
  });

  it("Scheduled tab shows only scheduled campaigns", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    await userEvent.click(screen.getByRole("button", { name: /^Scheduled/ }));
    expect(screen.getByRole("link", { name: /Black Friday Prep/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Summer Sale/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Flash Draft/ })).toBeNull();
  });

  it("Draft tab shows only draft campaigns", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    await userEvent.click(screen.getByRole("button", { name: /^Draft/ }));
    expect(screen.getByRole("link", { name: /Flash Draft/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Summer Sale/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Black Friday Prep/ })).toBeNull();
  });

  it("clicking All tab after filtering shows all campaigns again", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    await userEvent.click(screen.getByRole("button", { name: /^Scheduled/ }));
    expect(screen.queryByRole("link", { name: /Summer Sale/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(screen.getByRole("link", { name: /Summer Sale/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Black Friday Prep/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Flash Draft/ })).toBeTruthy();
  });

  it("tab counts reflect the number of campaigns per status", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    // All tab should show 3 total
    const allBtn = screen.getByRole("button", { name: /^All/ });
    expect(allBtn.textContent).toContain("3");
    // Scheduled tab should show 1
    const scheduledBtn = screen.getByRole("button", { name: /^Scheduled/ });
    expect(scheduledBtn.textContent).toContain("1");
  });
});

describe("CampaignList card rendering", () => {
  it("shows campaign name", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    expect(screen.getByRole("link", { name: /Summer Sale/ })).toBeTruthy();
  });

  it("shows Sale type label for sale campaigns", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    // Multiple cards may show "Sale" — verify at least one is present
    expect(screen.getAllByText("Sale").length).toBeGreaterThanOrEqual(1);
  });

  it("shows ML Recommendation type label for ml_recommendation campaigns", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    expect(screen.getByText("ML Recommendation")).toBeTruthy();
  });

  it("shows product count on campaign card", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    expect(screen.getByText(/5 products/)).toBeTruthy();
    expect(screen.getByText(/12 products/)).toBeTruthy();
    expect(screen.getByText(/0 products/)).toBeTruthy();
  });

  it("campaign card href points to /campaigns/[id]", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    const link = screen.getByRole("link", { name: /Summer Sale/ });
    expect(link.getAttribute("href")).toBe("/campaigns/c1");
  });

  it("shows date range when startsAt and endsAt are present", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    expect(screen.getByText(/Jul 1, 2026/)).toBeTruthy();
    expect(screen.getByText(/Aug 31, 2026/)).toBeTruthy();
  });

  it("does not show date range for campaigns without dates", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    // Flash Draft has no dates — its product count line should have no arrow
    const flashLink = screen.getByRole("link", { name: /Flash Draft/ });
    expect(flashLink.textContent).not.toContain("→");
  });
});

describe("CampaignList empty state", () => {
  it("shows empty state message when no campaigns exist", async () => {
    stubFetch([]);
    render(<CampaignList />);
    await screen.findByText("No campaigns yet");
    expect(screen.getByText(/Create your first campaign/)).toBeTruthy();
  });

  it("shows empty state when filtered tab has no matching campaigns", async () => {
    stubFetch(CAMPAIGNS);
    await renderLoaded();
    // Completed tab — none of the test campaigns are completed
    await userEvent.click(screen.getByRole("button", { name: /^Completed/ }));
    expect(screen.getByText("No campaigns yet")).toBeTruthy();
  });
});
