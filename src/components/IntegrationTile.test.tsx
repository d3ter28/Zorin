import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IntegrationTile } from "./IntegrationTile";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

const baseProps = {
  name: "Shopify",
  description: "Sync products, orders, and push price changes back to your store.",
  logoSrc: "/shopify-logo.svg",
  logoAlt: "Shopify",
  statusUrl: "/api/shopify/status",
  getConnectedLabel: (data: Record<string, unknown>) =>
    typeof data.shopDomain === "string" ? data.shopDomain : null,
};

describe("IntegrationTile", () => {
  it("shows the description and Connect when disconnected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(baseProps.description)).toBeTruthy();
    });
    expect(screen.getByText("Connect →")).toBeTruthy();
  });

  it("shows the connected label and Manage when connected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: true, shopDomain: "mystore.myshopify.com" }),
    }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("mystore.myshopify.com")).toBeTruthy();
    });
    expect(screen.getByText("Manage →")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
  });

  it("calls onOpen when clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={onOpen} />);
    await waitFor(() => {
      expect(screen.getByText("Connect →")).toBeTruthy();
    });
    await user.click(screen.getByRole("button", { name: /Shopify/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("falls back to disconnected appearance when the status fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false }) as unknown as typeof fetch;

    render(<IntegrationTile {...baseProps} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Connect →")).toBeTruthy();
    });
  });
});
