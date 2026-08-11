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

  it("marks the growth card as the current plan and offers upgrade/downgrade on the others", () => {
    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    expect(screen.getByText("Current plan")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Downgrade" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeTruthy();
  });

  it("shows Choose plan for all tiers when there is no current plan", () => {
    render(<BillingCard planTier={null} subscriptionStatus={null} />);
    expect(screen.queryByText("Current plan")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Choose plan" })).toHaveLength(3);
  });

  it("starts checkout for the selected tier and redirects on success", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    // @ts-expect-error -- test-only reassignment of window.location for redirect assertion
    delete window.location;
    (window as unknown as { location: unknown }).location = { ...originalLocation, href: "" };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    }) as unknown as typeof fetch;

    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    await user.click(screen.getByRole("button", { name: "Upgrade" }));

    expect(fetch).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "scale" }),
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session123");
    });
    (window as unknown as { location: unknown }).location = originalLocation;
  });

  it("shows an inline checkout error on failure without touching the portal button", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Plan change failed" }),
    }) as unknown as typeof fetch;

    render(<BillingCard planTier="growth" subscriptionStatus="active" />);
    await user.click(screen.getByRole("button", { name: "Downgrade" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Plan change failed");
    });
    expect((screen.getByRole("button", { name: "Manage billing" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
