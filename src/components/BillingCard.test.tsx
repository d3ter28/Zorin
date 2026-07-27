import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BillingCard } from "./BillingCard";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("BillingCard", () => {
  it("shows the plan tier and subscription status", () => {
    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    expect(screen.getByText("growth")).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("shows fallback text when plan tier and status are null", () => {
    render(<BillingCard planTier={null} subscriptionStatus={null} />);
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Inactive")).toBeTruthy();
  });

  it("calls the portal API and redirects on success", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    await user.click(screen.getByRole("button", { name: "Manage billing" }));

    expect(fetch).toHaveBeenCalledWith("/api/billing/portal", { method: "POST" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Loading…" })).toBeTruthy();
    });
  });

  it("shows an inline error when the portal call fails", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "No billing account found for this merchant yet" }),
    }) as unknown as typeof fetch;

    render(<BillingCard planTier={null} subscriptionStatus={null} />);
    await user.click(screen.getByRole("button", { name: "Manage billing" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "No billing account found for this merchant yet",
      );
    });
    expect((screen.getByRole("button", { name: "Manage billing" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows a network error message when the fetch call throws", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed")) as unknown as typeof fetch;

    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    await user.click(screen.getByRole("button", { name: "Manage billing" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Network error — please try again");
    });
  });
});
