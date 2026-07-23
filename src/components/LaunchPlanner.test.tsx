import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LaunchPlanner } from "./LaunchPlanner";

afterEach(cleanup);

describe("LaunchPlanner", () => {
  it("renders the default recommendation and scenario summary", () => {
    render(<LaunchPlanner />);

    expect(screen.getByRole("heading", { name: "Launch Planner" })).toBeTruthy();
    expect(screen.getByText("Recommended launch price")).toBeTruthy();
    expect(screen.getByText("$33.99")).toBeTruthy();
    expect(screen.getByText("Minimum viable price")).toBeTruthy();
    expect(screen.getByText("$26.67")).toBeTruthy();
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
});
