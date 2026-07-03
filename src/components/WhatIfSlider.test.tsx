import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatIfSlider } from "./WhatIfSlider";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

const reloadMock = vi.fn();

// jsdom's location.reload throws "Not implemented" — replace with a spy.
beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: reloadMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  reloadMock.mockReset();
});

const DEFAULT_PROPS = {
  productId: "p1",
  currentPrice: 1500,
  cogs: 600,
  compMedian: 1400,
  suggestedPrice: 1600,
};

function renderSlider(props: Partial<typeof DEFAULT_PROPS> = {}) {
  render(<WhatIfSlider {...DEFAULT_PROPS} {...props} />);
  return {
    slider: screen.getByRole("slider", { name: "Set price with slider" }) as HTMLInputElement,
    textInput: screen.getByRole("textbox", { name: "Set exact price" }) as HTMLInputElement,
  };
}

function stubFetch(impl: () => Promise<Response> = async () => json({})) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("WhatIfSlider", () => {
  it("initial: displays the suggested price", () => {
    stubFetch();
    renderSlider();
    // suggestedPrice=1600 → formatCents(1600) = "$16.00"
    expect(screen.getByText("$16.00")).toBeTruthy();
  });

  it("slider change: updates the price display", () => {
    stubFetch();
    const { slider } = renderSlider();
    fireEvent.change(slider, { target: { value: "1800" } });
    expect(screen.getByText("$18.00")).toBeTruthy();
  });

  it("text input change: updates the price display", async () => {
    stubFetch();
    const { textInput } = renderSlider();
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "20");
    expect(screen.getByText("$20.00")).toBeTruthy();
  });

  it("blur normalises the text input to 2 decimal places", async () => {
    stubFetch();
    const { textInput } = renderSlider();
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "20");
    await userEvent.tab();
    expect(textInput.value).toBe("20.00");
  });

  it("margin display updates when slider moves", () => {
    stubFetch();
    const { slider } = renderSlider();
    // Initial: price=1600, cogs=600 → margin=(1600-600)/1600=62.5%
    expect(screen.getByText("62.5%")).toBeTruthy();
    // Move to 2000: (2000-600)/2000=70%
    fireEvent.change(slider, { target: { value: "2000" } });
    expect(screen.getByText("70.0%")).toBeTruthy();
  });

  it("Apply disabled and hint shown when price equals current price", () => {
    stubFetch();
    const { slider } = renderSlider();
    // Move slider to currentPrice (1500)
    fireEvent.change(slider, { target: { value: "1500" } });
    const applyBtn = screen.getByRole("button", { name: "Apply $15.00" }) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(screen.getByText("Already the current price")).toBeTruthy();
  });

  it("Apply disabled and warning shown when price is zero", async () => {
    stubFetch();
    const { textInput } = renderSlider();
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "0");
    const applyBtn = screen.getByRole("button", { name: "Apply $0.00" }) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(screen.getByText("Enter a price above $0")).toBeTruthy();
  });

  it("busy: Apply button reads 'Applying…' and is disabled", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    renderSlider();
    await userEvent.click(screen.getByRole("button", { name: "Apply $16.00" }));
    const busy = screen.getByRole("button", { name: "Applying…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
  });

  it("success: calls window.location.reload", async () => {
    stubFetch();
    renderSlider();
    await userEvent.click(screen.getByRole("button", { name: "Apply $16.00" }));
    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("failure: shows error alert and re-enables the button", async () => {
    stubFetch(async () => json({}, false));
    renderSlider();
    await userEvent.click(screen.getByRole("button", { name: "Apply $16.00" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Couldn't apply price — try again.")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Apply $16.00" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
