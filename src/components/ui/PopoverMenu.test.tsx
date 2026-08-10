import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach } from "vitest";
import { PopoverMenu } from "./PopoverMenu";

afterEach(() => {
  cleanup();
});

describe("PopoverMenu", () => {
  it("opens content when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {() => <div>Menu content</div>}
      </PopoverMenu>,
    );
    expect(screen.queryByText("Menu content")).toBeNull();
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Menu content")).toBeTruthy();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
          {() => <div>Menu content</div>}
        </PopoverMenu>
        <button>Outside</button>
      </div>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Menu content")).toBeTruthy();
    await user.click(screen.getByText("Outside"));
    expect(screen.queryByText("Menu content")).toBeNull();
  });

  it("does not close when clicking inside the content", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {() => <div>Menu content</div>}
      </PopoverMenu>,
    );
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByText("Menu content"));
    expect(screen.getByText("Menu content")).toBeTruthy();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {() => <div>Menu content</div>}
      </PopoverMenu>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Menu content")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Menu content")).toBeNull();
  });

  it("supports a close() callback passed to content for menu-item clicks", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Open</button>}>
        {({ close }) => <button onClick={close}>Item</button>}
      </PopoverMenu>,
    );
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByText("Item"));
    expect(screen.queryByText("Item")).toBeNull();
  });
});
