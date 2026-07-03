import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CogsInput } from "./CogsInput";

const LABEL = "Cost of goods for Ceramic Mug";

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

// Single endpoint, so a plain mock (no URL routing) is enough.
function stubFetch(impl: () => Promise<Response> = async () => json({})) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderInput(
  overrides: Partial<Parameters<typeof CogsInput>[0]> = {},
) {
  const onSaved = vi.fn();
  render(
    <CogsInput
      productId="p1"
      initialCents={1250}
      onSaved={onSaved}
      label={LABEL}
      {...overrides}
    />,
  );
  const input = screen.getByRole("textbox", { name: LABEL }) as HTMLInputElement;
  return { onSaved, input };
}

// Replace the field's content and blur, which triggers save().
async function typeAndBlur(input: HTMLInputElement, text: string) {
  await userEvent.clear(input);
  if (text !== "") await userEvent.type(input, text);
  await userEvent.tab();
}

describe("CogsInput", () => {
  it("formats the initial cents as dollars", () => {
    stubFetch();
    const { input } = renderInput();
    expect(input.value).toBe("12.50");
  });

  it("renders empty with the dash placeholder when cogs is unknown", () => {
    stubFetch();
    const { input } = renderInput({ initialCents: null });
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("—");
  });

  it("no-change blur: skips the save entirely", async () => {
    const fetchMock = stubFetch();
    const { onSaved, input } = renderInput();
    await userEvent.click(input);
    await userEvent.tab();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("save: POSTs the new value in cents to the cogs endpoint", async () => {
    const fetchMock = stubFetch();
    const { input } = renderInput();
    await typeAndBlur(input, "14");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/products/p1/cogs");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ cogs: 1400 });
  });

  it("busy: disables the input while the save is pending", async () => {
    stubFetch(() => new Promise(() => {})); // never resolves
    const { input } = renderInput();
    await typeAndBlur(input, "14");
    expect(input.disabled).toBe(true);
  });

  it("success: normalizes the value, fires onSaved, re-enables", async () => {
    stubFetch();
    const { onSaved, input } = renderInput();
    await typeAndBlur(input, "14");
    await waitFor(() => expect(input.value).toBe("14.00"));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(false);
  });

  it("failure: reverts the value, flags aria-invalid, does not fire onSaved", async () => {
    // After the revert the value equals the initial value again, so blurring
    // once more is a no-op — retrying requires re-typing the new value.
    stubFetch(async () => json({}, false));
    const { onSaved, input } = renderInput();
    await typeAndBlur(input, "14");
    await waitFor(() => expect(input.value).toBe("12.50"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onSaved).not.toHaveBeenCalled();
    expect(input.disabled).toBe(false);
  });

  it("clearing the field saves cogs as null", async () => {
    const fetchMock = stubFetch();
    const { input } = renderInput();
    await typeAndBlur(input, "");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ cogs: null });
    await waitFor(() => expect(input.value).toBe(""));
  });

  it("non-numeric input serializes as null (pins current behavior)", async () => {
    // Math.round(NaN * 100) is NaN, and JSON.stringify turns NaN into null —
    // so "abc" is indistinguishable from clearing the field on the wire.
    // Characterization only; not an endorsement.
    const fetchMock = stubFetch();
    const { input } = renderInput();
    await typeAndBlur(input, "abc");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ cogs: null });
  });
});
