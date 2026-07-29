import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReactivatePlanPicker } from "./ReactivatePlanPicker";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ReactivatePlanPicker", () => {
  it("renders all three plans with pricing and feature lists", () => {
    render(<ReactivatePlanPicker />);
    expect(screen.getByText("Starter")).toBeTruthy();
    expect(screen.getByText("Growth")).toBeTruthy();
    expect(screen.getByText("Scale")).toBeTruthy();
    expect(screen.getByText("$39")).toBeTruthy();
    expect(screen.getByText("$99")).toBeTruthy();
    expect(screen.getByText("$249")).toBeTruthy();
    expect(screen.getByText("Up to 25 products")).toBeTruthy();
    expect(screen.getByText("Unlimited products")).toBeTruthy();
    expect(screen.getByText("Most popular")).toBeTruthy();
  });

  it("calls the checkout API with the chosen plan and shows a busy state on the clicked button", async () => {
    const user = userEvent.setup();
    // Never resolves — lets us observe the busy state before navigation would occur.
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<ReactivatePlanPicker />);
    const buttons = screen.getAllByRole("button", { name: "Choose plan" });
    await user.click(buttons[1]); // Growth

    expect(fetch).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "growth" }),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Redirecting…" })).toBeTruthy();
    });
    // All three buttons disable while any request is in flight.
    const allButtons = screen.getAllByRole("button");
    expect(allButtons).toHaveLength(3);
    for (const btn of allButtons) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("shows an inline error and re-enables buttons when the checkout call fails", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "plan must be one of starter, growth, scale" }),
    }) as unknown as typeof fetch;

    render(<ReactivatePlanPicker />);
    const buttons = screen.getAllByRole("button", { name: "Choose plan" });
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "plan must be one of starter, growth, scale",
      );
    });
    for (const btn of screen.getAllByRole("button")) {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it("shows a network error message when the fetch call throws", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed")) as unknown as typeof fetch;

    render(<ReactivatePlanPicker />);
    const buttons = screen.getAllByRole("button", { name: "Choose plan" });
    await user.click(buttons[2]);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Network error — please try again");
    });
  });
});
