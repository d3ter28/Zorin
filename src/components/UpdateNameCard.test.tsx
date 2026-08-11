import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UpdateNameCard } from "./UpdateNameCard";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("UpdateNameCard", () => {
  it("pre-fills the input with the initial name", () => {
    render(<UpdateNameCard initialName="Dexter" />);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("Dexter");
  });

  it("renders an empty input when there is no initial name", () => {
    render(<UpdateNameCard initialName="" />);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("");
  });

  it("shows an inline error when submitting a blank name", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn();

    render(<UpdateNameCard initialName="Dexter" />);
    await user.clear(screen.getByLabelText("Your name"));
    await user.type(screen.getByLabelText("Your name"), "   ");
    await user.click(screen.getByRole("button", { name: "Update account" }));
    expect(screen.getByRole("alert").textContent).toBe("Name is required");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("saves a valid name and shows a success message", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, name: "New Name" }),
    }) as unknown as typeof fetch;

    render(<UpdateNameCard initialName="Old Name" />);
    await user.clear(screen.getByLabelText("Your name"));
    await user.type(screen.getByLabelText("Your name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Update account" }));

    await waitFor(() => {
      expect(screen.getByText("Name updated.")).toBeTruthy();
    });
    expect(fetch).toHaveBeenCalledWith("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
  });

  it("shows the server error message on failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Name must be 100 characters or fewer" }),
    }) as unknown as typeof fetch;

    render(<UpdateNameCard initialName="Dexter" />);
    await user.click(screen.getByRole("button", { name: "Update account" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Name must be 100 characters or fewer");
    });
  });

  it("shows a network error message when the fetch call throws", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed")) as unknown as typeof fetch;

    render(<UpdateNameCard initialName="Dexter" />);
    await user.click(screen.getByRole("button", { name: "Update account" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Network error — please try again");
    });
  });
});
