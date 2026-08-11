import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SettingsDrawer } from "./SettingsDrawer";

afterEach(() => {
  cleanup();
});

describe("SettingsDrawer", () => {
  it("renders the title and children", () => {
    render(
      <SettingsDrawer title="Shopify" onClose={vi.fn()}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    expect(screen.getByText("Shopify")).toBeTruthy();
    expect(screen.getByText("Drawer body")).toBeTruthy();
  });

  it("calls onClose when the X button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    await user.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    await user.click(screen.getByText("Drawer body"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <SettingsDrawer title="Shopify" onClose={onClose}>
        <p>Drawer body</p>
      </SettingsDrawer>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
