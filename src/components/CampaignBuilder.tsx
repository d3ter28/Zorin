"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPicker, Product } from "@/components/ProductPicker";

export interface CampaignBuilderProps {
  campaignId?: string;
}

type CampaignType = "sale" | "ml_recommendation";
type SaleMode = "percentage" | "competitor_match" | "fixed_price";

interface PreviewProduct {
  productId: string;
  title: string;
  sku: string;
  currentPriceCents: number;
  targetPriceCents: number;
  changePct: number;           // already a percent (e.g. -10), not a fraction
  marginPct: number | null;
  skipped: boolean;
  skipReason: string | null;
  clampedByMarginFloor: boolean;
}

interface PreviewResult {
  totalProducts: number;
  changing: number;
  skipped: number;
  skipReasons: Record<string, number>;
  clampedByMarginFloor: number;
  avgChangePct: number;
  products: PreviewProduct[];
}

function buildRules(
  type: CampaignType,
  saleMode: SaleMode,
  pctChange: string,
  offsetPct: string,
  rounding: "none" | "99" | "95",
  marginFloorPct: string,
): Record<string, unknown> {
  let core: Record<string, unknown>;

  if (type === "ml_recommendation") {
    core = { mode: "ml_recommendation" };
  } else if (saleMode === "percentage") {
    core = { mode: "percentage", percentage: parseFloat(pctChange) || 0 };
  } else if (saleMode === "competitor_match") {
    core = { mode: "competitor_match", competitorOffset: parseFloat(offsetPct) || 0 };
  } else {
    // fixed_price requires fixedPriceCents — not supported in UI wizard, skip
    core = { mode: "percentage", percentage: 0 };
  }

  const rules: Record<string, unknown> = {
    ...core,
    rounding,
    marginFloorPct: marginFloorPct !== "" ? parseFloat(marginFloorPct) : 0,
  };
  return rules;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export function CampaignBuilder({ campaignId: initialCampaignId }: CampaignBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form state — Step 1
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("sale");
  const [saleMode, setSaleMode] = useState<SaleMode>("percentage");
  const [pctChange, setPctChange] = useState("-10");
  const [offsetPct, setOffsetPct] = useState("-5");
  const [rounding, setRounding] = useState<"none" | "99" | "95">("none");
  const [marginFloorPct, setMarginFloorPct] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [revertOnEnd, setRevertOnEnd] = useState(true); // sale default

  // Step 2 — products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Campaign id (may be set after create or passed in from edit page)
  const [campaignId, setCampaignId] = useState<string | undefined>(initialCampaignId);

  // Step 3 — preview
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Action states
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [executeError, setExecuteError] = useState("");
  const [conflictProductIds, setConflictProductIds] = useState<string[]>([]);
  const [overrideConflicts, setOverrideConflicts] = useState(false);

  // ── Load products on mount so they are ready when entering step 2 ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("failed");
        const data: Product[] = await res.json();
        setProducts(data);
      } catch {
        // Silently fail — user sees empty picker
      } finally {
        setLoadingProducts(false);
      }
    }
    load();
  }, []);

  // ── Populate form when editing an existing draft ──
  useEffect(() => {
    if (!initialCampaignId) return;
    async function load() {
      try {
        const res = await fetch(`/api/campaigns/${initialCampaignId}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setName(data.name ?? "");

        const loadedType: CampaignType = data.type ?? "sale";
        setType(loadedType);
        setRevertOnEnd(data.revertOnEnd ?? loadedType === "sale");

        if (data.startsAt) setStartsAt(data.startsAt.slice(0, 16));
        if (data.endsAt) setEndsAt(data.endsAt.slice(0, 16));

        let rules = data.rules;
        if (typeof rules === "string") {
          try { rules = JSON.parse(rules); } catch { rules = {}; }
        }
        if (rules) {
          if (rules.mode === "percentage") {
            setSaleMode("percentage");
            setPctChange(String(rules.percentage ?? -10));
          } else if (rules.mode === "competitor_match") {
            setSaleMode("competitor_match");
            setOffsetPct(String(rules.competitorOffset ?? -5));
          }
          if (rules.rounding) setRounding(rules.rounding as "none" | "99" | "95");
          if (rules.marginFloorPct != null) {
            setMarginFloorPct(String(rules.marginFloorPct));
          }
        }
        if (Array.isArray(data.products)) {
          setSelectedIds(data.products.map((p: { productId: string }) => p.productId));
        }
      } catch {
        // Silently fail
      }
    }
    load();
  }, [initialCampaignId]);

  // ── Handlers ──

  function handleTypeChange(newType: CampaignType) {
    setType(newType);
    // Flip the revertOnEnd default: sale campaigns revert, ML campaigns don't
    setRevertOnEnd(newType === "sale");
  }

  async function loadPreview() {
    setLoadingPreview(true);
    setPreview(null);
    try {
      const rules = buildRules(type, saleMode, pctChange, offsetPct, rounding, marginFloorPct);
      const res = await fetch("/api/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          rules,
          productIds: selectedIds,
          ...(startsAt ? { startsAt } : {}),
          ...(endsAt ? { endsAt } : {}),
        }),
      });
      if (!res.ok) throw new Error("preview failed");
      const data: PreviewResult = await res.json();
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleNext() {
    if (step === 2) {
      // Start preview load; it will complete after the step advances
      void loadPreview();
    }
    setStep((s) => (s + 1) as 1 | 2 | 3);
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);
  }

  async function saveDraftInner(): Promise<string | null> {
    const rules = buildRules(type, saleMode, pctChange, offsetPct, rounding, marginFloorPct);
    const body = {
      name: name.trim(),
      type,
      rules,
      revertOnEnd,
      ...(startsAt ? { startsAt } : {}),
      ...(endsAt ? { endsAt } : {}),
      productIds: selectedIds,
    };

    setSaving(true);
    try {
      let res: Response;
      if (campaignId) {
        res = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) return null;
      const data = await res.json();
      const id: string | undefined = data.id ?? campaignId;
      if (id) setCampaignId(id);
      return id ?? null;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const id = await saveDraftInner();
    if (id) router.push(`/campaigns/${id}`);
  }

  async function handleSchedule() {
    // If no start date, default to now
    const effectiveStartsAt = startsAt || new Date().toISOString();
    if (!startsAt) setStartsAt(effectiveStartsAt.slice(0, 16));

    let id = campaignId;
    if (!id) {
      const saved = await saveDraftInner();
      if (!saved) return;
      id = saved;
    } else {
      // Re-save to persist current form state (including startsAt)
      await saveDraftInner();
    }

    setScheduling(true);
    setScheduleError("");
    setConflictProductIds([]);

    try {
      const res = await fetch(`/api/campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedIds,
          ...(overrideConflicts ? { overrideConflicts: true } : {}),
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        const ids = (data.conflicts ?? []).map((c: { productId: string }) => c.productId);
        setConflictProductIds(ids);
        setScheduleError("This campaign conflicts with active campaigns for some products.");
        return;
      }

      if (!res.ok) {
        setScheduleError("Failed to schedule campaign.");
        return;
      }

      router.push(`/campaigns/${id}`);
    } catch {
      setScheduleError("Failed to schedule campaign.");
    } finally {
      setScheduling(false);
    }
  }

  async function handleExecuteNow() {
    let id = campaignId;
    if (!id) {
      const saved = await saveDraftInner();
      if (!saved) { setExecuteError("Failed to save campaign."); return; }
      id = saved;
    } else {
      await saveDraftInner();
    }

    setExecuting(true);
    setExecuteError("");

    try {
      // Step 1: Schedule (draft → scheduled)
      const schedRes = await fetch(`/api/campaigns/${id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedIds }),
      });
      if (!schedRes.ok) {
        const body = await schedRes.json().catch(() => ({}));
        setExecuteError((body as { error?: string }).error ?? "Failed to schedule campaign.");
        return;
      }

      // Step 2: Execute (scheduled → executing/active)
      const exRes = await fetch(`/api/campaigns/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!exRes.ok) {
        setExecuteError("Failed to execute campaign.");
        return;
      }
      router.push(`/campaigns/${id}`);
    } catch {
      setExecuteError("Failed to execute campaign.");
    } finally {
      setExecuting(false);
    }
  }

  const nextDisabled =
    (step === 1 && !name.trim()) ||
    (step === 2 && selectedIds.length === 0);

  return (
    <div>
      {/* Step indicator */}
      <nav aria-label="Campaign builder steps" className="mb-8 flex items-center gap-2 text-sm text-muted">
        <span className={step === 1 ? "font-semibold text-ink" : ""}>1. Setup</span>
        <span aria-hidden>→</span>
        <span className={step === 2 ? "font-semibold text-ink" : ""}>2. Select Products</span>
        <span aria-hidden>→</span>
        <span className={step === 3 ? "font-semibold text-ink" : ""}>3. Preview & Schedule</span>
      </nav>

      {/* ── Step 1: Setup ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Campaign name */}
          <div className="space-y-1">
            <label htmlFor="campaign-name" className="text-sm font-medium text-ink">
              Campaign name <span aria-hidden className="text-danger">*</span>
            </label>
            <input
              id="campaign-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Sale 2026"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2"
            />
          </div>

          {/* Type toggle */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Campaign type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("sale")}
                aria-pressed={type === "sale"}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  type === "sale"
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-panel text-ink hover:bg-surface"
                }`}
              >
                Sale
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("ml_recommendation")}
                aria-pressed={type === "ml_recommendation"}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  type === "ml_recommendation"
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-panel text-ink hover:bg-surface"
                }`}
              >
                ML Recommendation
              </button>
            </div>
          </div>

          {/* Sale-specific rules */}
          {type === "sale" && (
            <div className="space-y-4 rounded-xl border border-line bg-panel p-4">
              <div className="space-y-1">
                <label htmlFor="sale-mode" className="text-sm font-medium text-ink">
                  Pricing mode
                </label>
                <select
                  id="sale-mode"
                  value={saleMode}
                  onChange={(e) => setSaleMode(e.target.value as SaleMode)}
                  className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                >
                  <option value="percentage">Percentage Change</option>
                  <option value="competitor_match">Competitor Match</option>
                </select>
              </div>

              {saleMode === "percentage" && (
                <div className="space-y-1">
                  <label htmlFor="pct-change" className="text-sm font-medium text-ink">
                    Change by %
                  </label>
                  <input
                    id="pct-change"
                    type="number"
                    value={pctChange}
                    onChange={(e) => setPctChange(e.target.value)}
                    placeholder="-10"
                    className="w-32 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                  />
                  <p className="text-xs text-muted">
                    Negative = discount (e.g. -10 for 10% off)
                  </p>
                </div>
              )}

              {saleMode === "competitor_match" && (
                <div className="space-y-1">
                  <label htmlFor="offset-pct" className="text-sm font-medium text-ink">
                    Offset %
                  </label>
                  <input
                    id="offset-pct"
                    type="number"
                    value={offsetPct}
                    onChange={(e) => setOffsetPct(e.target.value)}
                    placeholder="-5"
                    className="w-32 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                  />
                  <p className="text-xs text-muted">
                    Offset from competitor median (e.g. -5 to undercut by 5%)
                  </p>
                </div>
              )}

              {saleMode === "fixed_price" && (
                <p className="text-sm text-muted">
                  Uses the ML-suggested price for each selected product.
                </p>
              )}
            </div>
          )}

          {type === "ml_recommendation" && (
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-sm text-muted">
                Uses ML elasticity model recommendations. Products with RAISE or LOWER
                recommendations will be auto-selected in the next step.
              </p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
            <p className="text-sm font-medium text-ink">Options</p>

            <select
              value={rounding}
              onChange={(e) => setRounding(e.target.value as "none" | "99" | "95")}
              className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="none">No rounding</option>
              <option value="99">Round to .99</option>
              <option value="95">Round to .95</option>
            </select>

            <div className="flex items-center gap-2">
              <label htmlFor="margin-floor" className="text-sm text-ink">
                Margin floor %
              </label>
              <input
                id="margin-floor"
                type="number"
                min="0"
                max="100"
                value={marginFloorPct}
                onChange={(e) => setMarginFloorPct(e.target.value)}
                placeholder="e.g. 15"
                className="w-24 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
              <span className="text-sm text-muted">(leave blank for no floor)</span>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={revertOnEnd}
                onChange={(e) => setRevertOnEnd(e.target.checked)}
              />
              Revert prices on end
            </label>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="starts-at" className="text-sm font-medium text-ink">
                Start date (optional)
              </label>
              <input
                id="starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded border border-line bg-panel px-2 py-1.5 text-sm text-ink"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ends-at" className="text-sm font-medium text-ink">
                End date (optional)
              </label>
              <input
                id="ends-at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded border border-line bg-panel px-2 py-1.5 text-sm text-ink"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Select Products ── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-ink">Select Products</h2>
          {loadingProducts ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-panel" />
              ))}
            </div>
          ) : (
            <ProductPicker
              products={products}
              campaignType={type}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              conflictProductIds={conflictProductIds}
            />
          )}
        </div>
      )}

      {/* ── Step 3: Preview & Schedule ── */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-ink">Preview &amp; Schedule</h2>

          {loadingPreview ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-panel" />
              ))}
            </div>
          ) : preview ? (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Changing" value={String(preview.changing)} />
                <StatCard label="Skipped" value={String(preview.skipped)} />
                <StatCard
                  label="Clamped by floor"
                  value={String(preview.clampedByMarginFloor)}
                />
                <StatCard
                  label="Avg change"
                  value={`${preview.avgChangePct.toFixed(1)}%`}
                />
              </div>

              {/* Conflict warning */}
              {conflictProductIds.length > 0 && (
                <div className="rounded-xl border border-warning bg-panel p-4">
                  <p className="text-sm font-semibold text-warning">
                    Conflict: {conflictProductIds.length} product
                    {conflictProductIds.length !== 1 ? "s are" : " is"} in another active
                    campaign.
                  </p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={overrideConflicts}
                      onChange={(e) => setOverrideConflicts(e.target.checked)}
                    />
                    Override conflicts and schedule anyway
                  </label>
                </div>
              )}

              {scheduleError && conflictProductIds.length === 0 && (
                <p className="text-sm text-danger">{scheduleError}</p>
              )}
              {executeError && <p className="text-sm text-danger">{executeError}</p>}

              {/* Product table */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-panel text-left text-xs font-medium uppercase tracking-wide text-muted">
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2 text-right">Original</th>
                      <th className="px-4 py-2 text-right">Target</th>
                      <th className="px-4 py-2 text-right">Change</th>
                      <th className="px-4 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.products.map((p) => {
                      const product = products.find((pr) => pr.id === p.productId);
                      return (
                        <tr key={p.productId} className={p.skipped ? "opacity-50" : ""}>
                          <td className="px-4 py-2 text-ink">
                            {product?.title ?? p.productId}
                          </td>
                          <td className="px-4 py-2 text-right text-muted">
                            ${(p.currentPriceCents / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-ink">
                            {p.skipped ? "—" : `$${(p.targetPriceCents / 100).toFixed(2)}`}
                          </td>
                          <td
                            className={`px-4 py-2 text-right ${
                              p.changePct > 0
                                ? "text-positive"
                                : p.changePct < 0
                                  ? "text-warning"
                                  : "text-muted"
                            }`}
                          >
                            {p.skipped
                              ? "—"
                              : `${p.changePct > 0 ? "+" : ""}${p.changePct.toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-2 text-muted">
                            {p.clampedByMarginFloor && "margin floor"}
                            {p.skipped && p.skipReason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Unable to load preview.</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="btn btn-ghost"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleSchedule}
              disabled={scheduling || saving}
              className="btn btn-primary"
            >
              {scheduling ? "Scheduling..." : "Schedule Campaign"}
            </button>
            <button
              type="button"
              onClick={handleExecuteNow}
              disabled={executing || saving}
              className="btn"
            >
              {executing ? "Executing..." : "Execute Now"}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between border-t border-line pt-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="btn btn-ghost"
        >
          Back
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={handleNext}
            disabled={nextDisabled}
            className="btn btn-primary"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
