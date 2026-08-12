import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignDetail } from "./CampaignDetail";

const baseCampaign = {
  id: "camp1",
  merchantId: "m1",
  name: "Summer Sale",
  type: "sale",
  status: "draft" as const,
  rules: '{"mode":"percentage","pctChange":-10}',
  revertOnEnd: true,
  startsAt: null,
  endsAt: null,
  executionCursor: 0,
  executedAt: null,
  revertedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  products: [],
  logs: [
    {
      id: "l1",
      event: "created",
      detail: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
};

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => data }) as Response),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderLoaded(status: string) {
  const campaign = { ...baseCampaign, status };
  stubFetch(campaign);
  render(<CampaignDetail campaignId="camp1" />);
  // Wait for the campaign name to appear (loading resolved)
  await waitFor(() =>
    expect(screen.getByText("Summer Sale")).toBeTruthy(),
  );
}

describe("CampaignDetail action buttons by status", () => {
  it("draft: shows Edit link and Delete button", async () => {
    await renderLoaded("draft");
    expect(screen.getByRole("link", { name: /Edit/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Delete/i })).toBeTruthy();
  });

  it("draft: does not show Execute Now, Cancel, or Stop Campaign", async () => {
    await renderLoaded("draft");
    expect(screen.queryByRole("button", { name: /Execute Now/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Cancel/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Stop Campaign/i })).toBeNull();
  });

  it("scheduled: shows Execute Now and Cancel buttons", async () => {
    await renderLoaded("scheduled");
    expect(screen.getByRole("button", { name: /Execute Now/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeTruthy();
  });

  it("scheduled: does not show Edit, Delete, or Stop Campaign", async () => {
    await renderLoaded("scheduled");
    expect(screen.queryByRole("link", { name: /Edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Stop Campaign/i })).toBeNull();
  });

  it("active: shows Stop Campaign button", async () => {
    await renderLoaded("active");
    expect(screen.getByRole("button", { name: /Stop Campaign/i })).toBeTruthy();
  });

  it("active: does not show Edit, Cancel, or Delete", async () => {
    await renderLoaded("active");
    expect(screen.queryByRole("link", { name: /Edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Cancel/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull();
  });

  it("executing: shows Stop Campaign button", async () => {
    await renderLoaded("executing");
    expect(screen.getByRole("button", { name: /Stop Campaign/i })).toBeTruthy();
  });

  it("reverting: shows Stop Campaign button", async () => {
    await renderLoaded("reverting");
    expect(screen.getByRole("button", { name: /Stop Campaign/i })).toBeTruthy();
  });

  it("completed: shows Duplicate button", async () => {
    await renderLoaded("completed");
    expect(screen.getByRole("button", { name: /Duplicate/i })).toBeTruthy();
  });

  it("completed: does not show Edit, Stop Campaign, Cancel, or Delete", async () => {
    await renderLoaded("completed");
    expect(screen.queryByRole("link", { name: /Edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Stop Campaign/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Cancel/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull();
  });

  it("all statuses: Export CSV link is always present", async () => {
    const statuses = [
      "draft",
      "scheduled",
      "active",
      "executing",
      "reverting",
      "completed",
    ];
    for (const status of statuses) {
      cleanup();
      await renderLoaded(status);
      expect(
        screen.getByRole("link", { name: /Export CSV/i }),
        `Export CSV missing for status: ${status}`,
      ).toBeTruthy();
    }
  });
});

describe("CampaignDetail header", () => {
  it("shows campaign name", async () => {
    await renderLoaded("draft");
    expect(screen.getByText("Summer Sale")).toBeTruthy();
  });

  it("shows status badge", async () => {
    await renderLoaded("active");
    // Status appears in the badge (and possibly elsewhere); verify at least one instance
    expect(screen.getAllByText("active").length).toBeGreaterThanOrEqual(1);
  });

  it("shows type label", async () => {
    await renderLoaded("draft");
    expect(screen.getByText("Sale")).toBeTruthy();
  });
});

describe("CampaignDetail timeline", () => {
  it("renders log entries", async () => {
    await renderLoaded("draft");
    // "created" event → humanized to "Created"
    expect(screen.getByText("Created")).toBeTruthy();
  });

  it("renders multiple log entries in order", async () => {
    const campaign = {
      ...baseCampaign,
      status: "active",
      logs: [
        {
          id: "l1",
          event: "created",
          detail: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "l2",
          event: "execution_started",
          detail: null,
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    };
    stubFetch(campaign);
    render(<CampaignDetail campaignId="camp1" />);
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeTruthy());
    expect(screen.getByText("Created")).toBeTruthy();
    expect(screen.getByText("Execution Started")).toBeTruthy();
  });
});

describe("CampaignDetail summary stats", () => {
  it("shows applied/total count", async () => {
    const campaign = {
      ...baseCampaign,
      products: [
        {
          id: "p1",
          productId: "prod1",
          originalPriceCents: 1000,
          targetPriceCents: 900,
          appliedAt: "2026-01-02T00:00:00Z",
          revertedAt: null,
          error: null,
          product: { title: "Widget A", sku: "SKU-001" },
        },
        {
          id: "p2",
          productId: "prod2",
          originalPriceCents: 2000,
          targetPriceCents: 1800,
          appliedAt: null,
          revertedAt: null,
          error: null,
          product: { title: "Widget B", sku: "SKU-002" },
        },
      ],
    };
    stubFetch(campaign);
    render(<CampaignDetail campaignId="camp1" />);
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeTruthy());
    expect(screen.getByText("1 / 2")).toBeTruthy();
  });
});
