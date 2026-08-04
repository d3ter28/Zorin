import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LaunchPlanner } from "./LaunchPlanner";

const { mockSearchParams } = vi.hoisted(() => ({ mockSearchParams: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

afterEach(() => {
  cleanup();
  mockSearchParams.forEach((_value, key) => mockSearchParams.delete(key));
  vi.restoreAllMocks();
});

describe("LaunchPlanner", () => {
  it("renders the default recommendation and scenario summary", () => {
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Launch Planner" })).toBeTruthy();
    expect(screen.getByText("Recommended launch price")).toBeTruthy();
    expect(screen.getByText("$33.99")).toBeTruthy();
    expect(screen.getByText("Minimum viable price")).toBeTruthy();
    expect(screen.getAllByText("$26.67").length).toBeGreaterThan(0);
    expect(screen.getByText("Stretch price")).toBeTruthy();
    expect(screen.getByText("$39.99")).toBeTruthy();
    expect(screen.getByText("Net profit")).toBeTruthy();
    expect(screen.getByText("$729.00")).toBeTruthy();
  });

  it("updates the recommendation when unit cost changes", async () => {
    render(<LaunchPlanner />);

    const unitCost = screen.getByRole("spinbutton", { name: "Unit cost" });
    await userEvent.clear(unitCost);
    await userEvent.type(unitCost, "20");

    expect(screen.getByText("$50.99")).toBeTruthy();
  });

  it("uses competitor prices for market-aware recommendations", async () => {
    render(<LaunchPlanner />);

    await userEvent.type(screen.getByRole("textbox", { name: "Competitor prices" }), "29, 35, 39, 42, 49");

    expect(screen.getByText("$39.99")).toBeTruthy();
    expect(screen.getByText(/medium confidence/i)).toBeTruthy();
  });

  it("updates net profit when monthly units change", async () => {
    render(<LaunchPlanner />);

    const monthlyUnits = screen.getByRole("spinbutton", { name: "Expected monthly units" });
    await userEvent.clear(monthlyUnits);
    await userEvent.type(monthlyUnits, "200");

    expect(screen.getByText("$1,958.00")).toBeTruthy();
  });

  it("shows validation error for impossible margin and fees", async () => {
    render(<LaunchPlanner />);

    const requiredMargin = screen.getByRole("spinbutton", { name: "Required margin percent" });
    await userEvent.clear(requiredMargin);
    await userEvent.type(requiredMargin, "90");

    expect(screen.getByRole("alert").textContent).toMatch(/margin and fee/i);
  });

  it("clamps discount percent before simulating revenue", async () => {
    render(<LaunchPlanner />);

    const discount = screen.getByRole("spinbutton", { name: "Discount percent" });
    await userEvent.clear(discount);
    await userEvent.type(discount, "150");

    expect(screen.getByText("$170.00")).toBeTruthy();
    expect(screen.queryByText("-$1,699.50")).toBeNull();
  });

  it("warns when the scenario discount breaks the margin floor", async () => {
    render(<LaunchPlanner />);

    const discount = screen.getByRole("spinbutton", { name: "Discount percent" });
    await userEvent.clear(discount);
    await userEvent.type(discount, "30");

    expect(screen.getByText(/below your minimum viable price/i)).toBeTruthy();
  });

  it("renders Launch Readiness in Launch Mode by default", () => {
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Launch Readiness" })).toBeTruthy();
    expect(screen.getByText("Launch Mode")).toBeTruthy();
    expect(screen.getByText(/does not have enough sales history/i)).toBeTruthy();
  });

  it("changes readiness to Optimization Mode at 30 sales data points", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    const salesInput = screen.getByLabelText("Sales data points");
    await user.clear(salesInput);
    await user.type(salesInput, "30");

    expect(screen.getByText("Optimization Mode")).toBeTruthy();
    expect(screen.getByText(/demand-aware price optimization/i)).toBeTruthy();
  });

  it("updates Why this price copy when competitor prices are added", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Why this price?" })).toBeTruthy();
    expect(screen.getByText(/no market references/i)).toBeTruthy();

    await user.type(screen.getByLabelText("Competitor prices"), "29, 35, 39, 42");

    expect(screen.getByText(/you supplied 4 competitor prices/i)).toBeTruthy();
    expect(screen.getByText(/the market median is/i)).toBeTruthy();
  });

  it("saves and removes a scenario in the comparison table", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    expect(screen.getByText("Save a scenario to compare launch assumptions.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));

    const table = screen.getByRole("table", { name: "Saved launch scenarios" });
    expect(within(table).getByText("Conservative launch")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Remove Conservative launch" }));
    expect(screen.getByText("Save a scenario to compare launch assumptions.")).toBeTruthy();
  });

  it("limits saved scenarios to three", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    await user.click(screen.getByRole("button", { name: "Save Scenario" }));
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));

    expect(screen.getByText("Compare up to 3 scenarios at a time. Remove one to save another.")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("shows non-misleading labels for a losing scenario", async () => {
    const user = userEvent.setup();
    render(<LaunchPlanner />);

    await user.clear(screen.getByLabelText("Scenario price"));
    await user.type(screen.getByLabelText("Scenario price"), "1");

    expect(screen.getByText("Not reachable")).toBeTruthy();
    expect(screen.getByText("No paid ads room")).toBeTruthy();
  });

  it("prefills competitor prices from a product's saved list when ?productId= is present", async () => {
    mockSearchParams.set("productId", "p1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "c1", competitorName: "A", priceCents: 2900, url: null, capturedAt: "2026-01-01" },
          { id: "c2", competitorName: "B", priceCents: 3500, url: null, capturedAt: "2026-01-01" },
        ],
      })
    );

    render(<LaunchPlanner />);

    await waitFor(() => {
      const field = screen.getByRole("textbox", { name: "Competitor prices" }) as HTMLInputElement;
      expect(field.value).toContain("29.00");
      expect(field.value).toContain("35.00");
    });
    expect(fetch).toHaveBeenCalledWith("/api/products/p1/competitor-prices");
  });

  it("leaves competitor prices empty when no productId is present", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<LaunchPlanner />);

    const field = screen.getByRole("textbox", { name: "Competitor prices" }) as HTMLInputElement;
    expect(field.value).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
