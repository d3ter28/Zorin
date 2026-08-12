import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductPicker } from "./ProductPicker";

// Four fixture products: two kitchen (raise/lower), two office (hold/null), varied margins.
const PRODUCTS = [
  {
    id: "p1",
    title: "Ceramic Mug",
    sku: "MUG-008",
    currentPrice: 1500,
    cogs: 600,
    category: "kitchen",
    estUnits: 100,
    imageUrl: "https://example.com/mug.jpg",
    margin: 0.1, // 10% — below any reasonable threshold
    recommendedAction: "raise" as const,
    suggestedPrice: 1600,
    modelHealth: { r2: 0.9, dataPoints: 50, confidenceScore: 0.85 },
    comparison: { compMedian: 1400, pctVsMedian: 0.07, competitorCount: 3 },
  },
  {
    id: "p2",
    title: "Steel Bottle",
    sku: "BTL-002",
    currentPrice: 2200,
    cogs: 900,
    category: "kitchen",
    estUnits: 50,
    imageUrl: null,
    margin: 0.59,
    recommendedAction: "lower" as const,
    suggestedPrice: 2100,
    modelHealth: null,
    comparison: { compMedian: 2250, pctVsMedian: -0.02, competitorCount: 2 },
  },
  {
    id: "p3",
    title: "Desk Lamp",
    sku: "LMP-001",
    currentPrice: 3500,
    cogs: 1400,
    category: "office",
    estUnits: 20,
    imageUrl: null,
    margin: 0.6,
    recommendedAction: "hold" as const,
    suggestedPrice: 3500,
    modelHealth: null,
    comparison: null,
  },
  {
    id: "p4",
    title: "Standing Desk",
    sku: "DESK-005",
    currentPrice: 50000,
    cogs: 20000,
    category: "office",
    estUnits: 5,
    imageUrl: null,
    margin: 0.4,
    recommendedAction: null,
    suggestedPrice: null,
    modelHealth: null,
    comparison: null,
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProductPicker", () => {
  it("renders a checkbox row for every product", () => {
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Select Ceramic Mug" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Steel Bottle" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Desk Lamp" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Standing Desk" })).toBeTruthy();
  });

  it("category filter hides products outside the selected category", async () => {
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Category filter" });
    await userEvent.selectOptions(select, "kitchen");

    expect(screen.getByRole("checkbox", { name: "Select Ceramic Mug" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Steel Bottle" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Select Desk Lamp" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Select Standing Desk" })).toBeNull();
  });

  it("Select all calls onChange with all currently visible product IDs", async () => {
    const onChange = vi.fn();
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(onChange).toHaveBeenCalledWith(["p1", "p2", "p3", "p4"]);
  });

  it("Select all after category filter only selects visible products", async () => {
    const onChange = vi.fn();
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category filter" }),
      "office",
    );
    await userEvent.click(screen.getByRole("button", { name: "Select all" }));
    const called = onChange.mock.calls.at(-1)![0] as string[];
    expect(called.sort()).toEqual(["p3", "p4"]);
  });

  it("ML auto-select calls onChange on mount with RAISE and LOWER ids only", () => {
    const onChange = vi.fn();
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="ml_recommendation"
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["p1", "p2"]);
  });

  it("sale campaignType does NOT auto-call onChange on mount", () => {
    const onChange = vi.fn();
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("individual checkbox toggle calls onChange with the updated id set", async () => {
    const onChange = vi.fn();
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Ceramic Mug" }));
    expect(onChange).toHaveBeenCalledWith(["p1"]);
  });

  it("unchecking a selected product removes it from the selection", async () => {
    const onChange = vi.fn();
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={["p1", "p2"]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Ceramic Mug" }));
    expect(onChange).toHaveBeenCalledWith(["p2"]);
  });

  it("live count badge reflects selectedIds.length and total products", () => {
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={["p1", "p2"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("2 of 4 products selected")).toBeTruthy();
  });

  it("live count badge shows 0 when nothing is selected", () => {
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("0 of 4 products selected")).toBeTruthy();
  });

  it("conflict indicator is shown for products in conflictProductIds", () => {
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={vi.fn()}
        conflictProductIds={["p1"]}
      />,
    );
    expect(screen.getByRole("img", { name: "In another active campaign" })).toBeTruthy();
  });

  it("conflict indicator is not shown for products not in conflictProductIds", () => {
    render(
      <ProductPicker
        products={PRODUCTS}
        campaignType="sale"
        selectedIds={[]}
        onChange={vi.fn()}
        conflictProductIds={["p1"]}
      />,
    );
    // Only one conflict indicator — p1 only
    expect(screen.getAllByRole("img", { name: "In another active campaign" })).toHaveLength(1);
  });
});
