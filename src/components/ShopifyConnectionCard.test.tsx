import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ShopifyConnectionCard } from "./ShopifyConnectionCard";

// jsdom doesn't implement window.confirm — provide a stub
Object.defineProperty(window, "confirm", {
  writable: true,
  value: vi.fn(() => true),
});

beforeEach(() => {
  vi.resetAllMocks();
  (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

describe("ShopifyConnectionCard", () => {
  it("renders loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<ShopifyConnectionCard />);
    // getByText throws if not found — finding it is sufficient
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it("renders disconnected state when not connected", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop domain/i)).toBeTruthy();
    });
    expect(screen.getByLabelText(/access token/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
  });

  it("renders connected state with shop info", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        shopDomain: "mystore.myshopify.com",
        lastSyncedAt: "2025-01-01T00:00:00Z",
      }),
    }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByText("mystore.myshopify.com")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /sync now/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeTruthy();
  });

  it("shows Never when lastSyncedAt is missing", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        shopDomain: "mystore.myshopify.com",
      }),
    }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByText(/never/i)).toBeTruthy();
    });
  });

  it("calls connect API on form submit", async () => {
    const user = userEvent.setup();

    global.fetch = vi
      .fn()
      // initial status fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: false }),
      })
      // connect call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, shopName: "My Store" }),
      })
      // re-fetch status after connect
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          connected: true,
          shopDomain: "mystore.myshopify.com",
          lastSyncedAt: null,
        }),
      }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop domain/i)).toBeTruthy();
    });

    await user.type(screen.getByLabelText(/shop domain/i), "mystore.myshopify.com");
    await user.type(screen.getByLabelText(/access token/i), "shpat_abc123");
    await user.type(screen.getByLabelText(/api secret/i), "shpss_abc123");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const connectCall = calls.find((c: unknown[]) =>
        typeof c[0] === "string" && c[0].includes("/api/shopify/connect")
      );
      expect(connectCall).toBeDefined();
    });
  });

  it("shows error when connect fails", async () => {
    const user = userEvent.setup();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: false }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid access token" }),
      }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop domain/i)).toBeTruthy();
    });

    await user.type(screen.getByLabelText(/shop domain/i), "mystore.myshopify.com");
    await user.type(screen.getByLabelText(/access token/i), "bad_token");
    await user.type(screen.getByLabelText(/api secret/i), "shpss_bad");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  it("shows disconnect confirmation and calls disconnect API", async () => {
    const user = userEvent.setup();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          connected: true,
          shopDomain: "mystore.myshopify.com",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: false }),
      }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const disconnectCall = calls.find((c: unknown[]) =>
        typeof c[0] === "string" && c[0].includes("/api/shopify/disconnect")
      );
      expect(disconnectCall).toBeDefined();
    });
  });

  it("shows sync results after syncing", async () => {
    const user = userEvent.setup();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          connected: true,
          shopDomain: "mystore.myshopify.com",
          lastSyncedAt: "2025-01-01T00:00:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: { created: 5, updated: 2, skipped: 1 },
          orders: { upserted: 10, skippedLineItems: 0 },
        }),
      })
      // re-fetch status after sync
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          connected: true,
          shopDomain: "mystore.myshopify.com",
          lastSyncedAt: new Date().toISOString(),
        }),
      }) as unknown as typeof fetch;

    render(<ShopifyConnectionCard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sync now/i })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getByText(/5 created/i)).toBeTruthy();
    });
    expect(screen.getByText(/2 updated/i)).toBeTruthy();
  });
});
