"use client";
import { useEffect, useMemo, useState } from "react";

export interface Product {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  imageUrl: string | null;
  margin: number | null;
  recommendedAction: "raise" | "lower" | "hold" | null;
  suggestedPrice: number | null;
  modelHealth: { r2: number; dataPoints: number; confidenceScore: number } | null;
  comparison: { compMedian: number; pctVsMedian: number; competitorCount: number } | null;
}

export interface ProductPickerProps {
  products: Product[];
  campaignType: "sale" | "ml_recommendation";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  conflictProductIds?: string[];
}

export function ProductPicker({
  products,
  campaignType,
  selectedIds,
  onChange,
  conflictProductIds = [],
}: ProductPickerProps) {
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [marginThreshold, setMarginThreshold] = useState("");
  const [filterHasRec, setFilterHasRec] = useState(false);
  const [filterRaiseOnly, setFilterRaiseOnly] = useState(false);
  const [filterLowerOnly, setFilterLowerOnly] = useState(false);
  const [filterHasCompetitor, setFilterHasCompetitor] = useState(false);

  // ML auto-select: on mount, pre-select all RAISE/LOWER products.
  useEffect(() => {
    if (campaignType === "ml_recommendation" && selectedIds.length === 0) {
      const ids = products
        .filter((p) => p.recommendedAction === "raise" || p.recommendedAction === "lower")
        .map((p) => p.id);
      onChange(ids);
    }
    // Intentionally runs only on mount — products/onChange identity is stable at mount time.
    // selectedIds.length check prevents wiping manual selections on back-navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "__all__" && p.category !== categoryFilter) return false;
      if (marginThreshold !== "") {
        const threshold = parseFloat(marginThreshold) / 100;
        if (!isNaN(threshold)) {
          if (p.margin === null || p.margin >= threshold) return false;
        }
      }
      if (filterHasRec && (p.recommendedAction === null || p.recommendedAction === "hold"))
        return false;
      if (filterRaiseOnly && p.recommendedAction !== "raise") return false;
      if (filterLowerOnly && p.recommendedAction !== "lower") return false;
      if (
        filterHasCompetitor &&
        (p.comparison === null || p.comparison.competitorCount <= 0)
      )
        return false;
      return true;
    });
  }, [
    products,
    categoryFilter,
    marginThreshold,
    filterHasRec,
    filterRaiseOnly,
    filterLowerOnly,
    filterHasCompetitor,
  ]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const conflictSet = useMemo(() => new Set(conflictProductIds), [conflictProductIds]);

  const visibleIds = visibleProducts.map((p) => p.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  function handleSelectAll() {
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);
      onChange(selectedIds.filter((id) => !visibleSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      visibleIds.forEach((id) => next.add(id));
      onChange(Array.from(next));
    }
  }

  function handleToggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  }

  return (
    <div className="rounded-xl border border-line bg-surface">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Category filter"
          className="rounded border border-line bg-panel px-2 py-1 text-sm text-ink"
        >
          <option value="__all__">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1 text-sm text-muted">
          Margin below
          <input
            type="number"
            value={marginThreshold}
            onChange={(e) => setMarginThreshold(e.target.value)}
            placeholder="e.g. 30"
            aria-label="Margin below threshold"
            className="w-16 rounded border border-line bg-panel px-2 py-1 text-sm text-ink"
          />
          %
        </label>

        <label className="flex cursor-pointer items-center gap-1 text-sm text-muted">
          <input
            type="checkbox"
            checked={filterHasRec}
            onChange={(e) => setFilterHasRec(e.target.checked)}
          />
          Has recommendation
        </label>

        <label className="flex cursor-pointer items-center gap-1 text-sm text-muted">
          <input
            type="checkbox"
            checked={filterRaiseOnly}
            onChange={(e) => setFilterRaiseOnly(e.target.checked)}
          />
          RAISE only
        </label>

        <label className="flex cursor-pointer items-center gap-1 text-sm text-muted">
          <input
            type="checkbox"
            checked={filterLowerOnly}
            onChange={(e) => setFilterLowerOnly(e.target.checked)}
          />
          LOWER only
        </label>

        <label className="flex cursor-pointer items-center gap-1 text-sm text-muted">
          <input
            type="checkbox"
            checked={filterHasCompetitor}
            onChange={(e) => setFilterHasCompetitor(e.target.checked)}
          />
          Has competitor data
        </label>
      </div>

      {/* ── Toolbar: select-all + count badge ── */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={handleSelectAll}
          disabled={visibleIds.length === 0}
        >
          {allVisibleSelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-sm text-muted" aria-live="polite">
          {selectedIds.length} of {products.length} products selected
        </span>
      </div>

      {/* ── Product rows ── */}
      <div className="divide-y divide-line">
        {visibleProducts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No products match the current filters.
          </div>
        ) : (
          visibleProducts.map((p) => {
            const isConflict = conflictSet.has(p.id);
            const isSelected = selectedSet.has(p.id);
            const actionable =
              p.recommendedAction === "raise" || p.recommendedAction === "lower";

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-panel"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={isSelected}
                  onChange={() => handleToggle(p.id)}
                  aria-label={`Select ${p.title}`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">{p.title}</span>
                    {isConflict && (
                      <span
                        role="img"
                        aria-label="In another active campaign"
                        title="In another active campaign"
                        className="shrink-0 text-warning"
                      >
                        ⚠
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-faint">
                    {p.sku} · {p.category}
                  </div>
                </div>

                <div className="shrink-0 text-right text-sm">
                  {actionable ? (
                    <span
                      className={
                        p.recommendedAction === "raise" ? "text-positive" : "text-warning"
                      }
                    >
                      {p.recommendedAction === "raise" ? "↑ RAISE" : "↓ LOWER"}
                    </span>
                  ) : p.recommendedAction === "hold" ? (
                    <span className="text-faint">Hold</span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
