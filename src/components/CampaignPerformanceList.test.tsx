import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { CampaignPerformanceList } from "./CampaignPerformanceList";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockCampaigns(list: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => list })) as unknown as typeof fetch);
}

const base = {
  campaignId: "c1", name: "Summer Sale", status: "completed",
  firstAppliedAt: "2026-02-01T00:00:00Z", windowEnd: "2026-02-15T00:00:00Z",
  days: 14, productsChanged: 47, duringProfitCents: 980000, priorProfitCents: 750000,
  deltaCents: 230000, noPriorBaseline: false, stillRunning: false, estimated: false,
};

describe("CampaignPerformanceList", () => {
  it("renders a campaign with its delta and links to the campaign", async () => {
    mockCampaigns([base]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeInTheDocument());
    expect(screen.getByText(/\+\$2,300\.00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Summer Sale/i })).toHaveAttribute("href", "/campaigns/c1");
  });

  it("shows 'no prior baseline' instead of a delta", async () => {
    mockCampaigns([{ ...base, noPriorBaseline: true }]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/no prior baseline/i)).toBeInTheDocument());
  });

  it("shows a 'still running' note", async () => {
    mockCampaigns([{ ...base, stillRunning: true, status: "active" }]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/still running/i)).toBeInTheDocument());
  });

  it("shows an empty state when there are no campaigns", async () => {
    mockCampaigns([]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/no campaign performance yet/i)).toBeInTheDocument());
  });

  it("shows a negative delta with the correct sign character", async () => {
    mockCampaigns([{ ...base, deltaCents: -100000 }]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeInTheDocument());
    // The component uses U+2212 MINUS SIGN (−), not ASCII hyphen (-)
    // The ▼ is in the same span as the amount, so check toHaveTextContent
    const deltaEl = screen.getByText(/−\$1,000\.00/);
    expect(deltaEl).toBeInTheDocument();
    expect(deltaEl).toHaveTextContent("▼");
  });

  it("shows the 'est.' badge when estimated is true", async () => {
    mockCampaigns([{ ...base, estimated: true }]);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeInTheDocument());
    expect(screen.getByText("est.")).toBeInTheDocument();
  });

  it("shows the empty state when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }) as unknown as typeof fetch);
    render(<CampaignPerformanceList />);
    await waitFor(() => expect(screen.getByText(/no campaign performance yet/i)).toBeInTheDocument());
  });
});
