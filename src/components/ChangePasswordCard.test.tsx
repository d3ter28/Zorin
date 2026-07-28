import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChangePasswordCard } from "./ChangePasswordCard";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { current, next, confirm }: { current: string; next: string; confirm: string },
) {
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password (8+ characters)"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
}

describe("ChangePasswordCard", () => {
  it("renders current, new, and confirm password fields", () => {
    render(<ChangePasswordCard />);
    expect(screen.getByLabelText("Current password")).toBeTruthy();
    expect(screen.getByLabelText("New password (8+ characters)")).toBeTruthy();
    expect(screen.getByLabelText("Confirm new password")).toBeTruthy();
  });

  it("shows a client-side error for a too-short new password without calling the API", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn();

    render(<ChangePasswordCard />);
    await fillForm(user, { current: "oldpassword1", next: "short", confirm: "short" });
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert").textContent).toBe("New password must be at least 8 characters");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a client-side error when new and confirm passwords don't match, without calling the API", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn();

    render(<ChangePasswordCard />);
    await fillForm(user, { current: "oldpassword1", next: "newpassword1", confirm: "different1" });
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert").textContent).toBe("New passwords do not match");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the fields and shows a success message on a successful submit", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch;

    render(<ChangePasswordCard />);
    await fillForm(user, { current: "oldpassword1", next: "newpassword1", confirm: "newpassword1" });
    await user.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(screen.getByText("Password changed.")).toBeTruthy();
    });
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("New password (8+ characters)") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Confirm new password") as HTMLInputElement).value).toBe("");
  });

  it("shows the API's error message and preserves the fields on a failed submit", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Current password is incorrect" }),
    }) as unknown as typeof fetch;

    render(<ChangePasswordCard />);
    await fillForm(user, { current: "wrongpassword", next: "newpassword1", confirm: "newpassword1" });
    await user.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Current password is incorrect");
    });
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("wrongpassword");
    expect((screen.getByLabelText("New password (8+ characters)") as HTMLInputElement).value).toBe("newpassword1");
  });

  it("shows a network error message when the fetch call throws", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed")) as unknown as typeof fetch;

    render(<ChangePasswordCard />);
    await fillForm(user, { current: "oldpassword1", next: "newpassword1", confirm: "newpassword1" });
    await user.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Network error — please try again");
    });
  });
});
