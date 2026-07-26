"use client";

import { useMemo, useState } from "react";
import {
  calculateBreakEvenPlan,
  type LaunchRiskLevel,
} from "@/lib/launchPlanner/calculateBreakEvenPlan";
import { calculateReadiness } from "@/lib/launchPlanner/calculateReadiness";
import {
  calculateLaunchPlan,
  type LaunchPositioning,
  type LaunchRoundingMode,
} from "@/lib/launchPlanner/calculateLaunchPlan";
import { explainLaunchPrice } from "@/lib/launchPlanner/explainLaunchPrice";
import { simulateLaunchScenario } from "@/lib/launchPlanner/simulateLaunchScenario";
import { dollarsToCents, formatCents, pct } from "@/lib/money";

function currencyToCents(value: string): number {
  return dollarsToCents(value) ?? 0;
}

function percentToRatio(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(95, Math.max(0, parsed)) / 100;
}

function numericValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

interface SavedLaunchScenario {
  id: string;
  name: string;
  priceCents: number;
  monthlyUnits: number;
  discountPct: number;
  returnRatePct: number;
  adCostPerSaleCents: number;
  fixedMonthlyCostsCents: number;
  netProfitCents: number;
  breakEvenUnits: number | null;
  risk: LaunchRiskLevel;
}

const DEFAULT_SCENARIO_NAMES = ["Conservative launch", "Base launch", "Aggressive launch"];

function integerValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(999, Math.max(0, Math.floor(parsed))) : 0;
}

function riskClassName(risk: LaunchRiskLevel): string {
  if (risk === "low") return "text-success";
  if (risk === "medium") return "text-warning";
  return "text-danger";
}

function Field({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <span className="flex items-center rounded-lg border border-line-strong bg-surface pl-2 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        {prefix ? <span className="text-sm text-faint">{prefix}</span> : null}
        <input
          aria-label={label}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-2 py-2 text-sm tabular text-ink outline-none"
        />
      </span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold tabular text-ink">{value}</p>
    </div>
  );
}

export function LaunchPlanner() {
  const [unitCost, setUnitCost] = useState("12");
  const [shipping, setShipping] = useState("3");
  const [packaging, setPackaging] = useState("1");
  const [otherCosts, setOtherCosts] = useState("0");
  const [paymentFee, setPaymentFee] = useState("3");
  const [platformFee, setPlatformFee] = useState("2");
  const [requiredMargin, setRequiredMargin] = useState("35");
  const [positioning, setPositioning] = useState<LaunchPositioning>("mid-market");
  const [roundingMode, setRoundingMode] = useState<LaunchRoundingMode>("ninety-nine");
  const [competitors, setCompetitors] = useState("");
  const [scenarioPrice, setScenarioPrice] = useState("");
  const [monthlyUnits, setMonthlyUnits] = useState("100");
  const [adCost, setAdCost] = useState("4");
  const [fixedCosts, setFixedCosts] = useState("500");
  const [returnRate, setReturnRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [salesDataPoints, setSalesDataPoints] = useState("0");
  const [savedScenarios, setSavedScenarios] = useState<SavedLaunchScenario[]>([]);
  const [scenarioLimitMessage, setScenarioLimitMessage] = useState("");

  const competitorPricesCents = useMemo(
    () =>
      competitors
        .split(/[,\n]/)
        .map((part) => dollarsToCents(part.trim()))
        .filter((price): price is number => price !== null && price > 0),
    [competitors]
  );

  const plan = calculateLaunchPlan({
    unitCostCents: currencyToCents(unitCost),
    shippingCents: currencyToCents(shipping),
    packagingCents: currencyToCents(packaging),
    otherUnitCostsCents: currencyToCents(otherCosts),
    paymentFeePct: percentToRatio(paymentFee),
    platformFeePct: percentToRatio(platformFee),
    requiredMarginPct: percentToRatio(requiredMargin),
    positioning,
    competitorPricesCents,
    roundingMode,
  });

  const activePriceCents =
    scenarioPrice.trim() === "" && plan.ok ? plan.recommendedPriceCents : currencyToCents(scenarioPrice);

  const scenario = simulateLaunchScenario({
    priceCents: activePriceCents,
    monthlyUnits: numericValue(monthlyUnits),
    unitCostCents: currencyToCents(unitCost),
    shippingCents: currencyToCents(shipping),
    packagingCents: currencyToCents(packaging),
    otherUnitCostsCents: currencyToCents(otherCosts),
    paymentFeePct: percentToRatio(paymentFee),
    platformFeePct: percentToRatio(platformFee),
    adCostPerSaleCents: currencyToCents(adCost),
    fixedMonthlyCostsCents: currencyToCents(fixedCosts),
    returnRatePct: percentToRatio(returnRate),
    discountPct: percentToRatio(discount),
  });
  const unitCostTotalCents =
    currencyToCents(unitCost) +
    currencyToCents(shipping) +
    currencyToCents(packaging) +
    currencyToCents(otherCosts);

  const readiness = calculateReadiness({
    salesDataPoints: integerValue(salesDataPoints),
    competitorPriceCount: competitorPricesCents.length,
    hasUnitCost: currencyToCents(unitCost) > 0,
    hasTargetMargin: percentToRatio(requiredMargin) > 0,
  });

  const explanation =
    plan.ok
      ? explainLaunchPrice({
          minimumViablePriceCents: plan.minimumViablePriceCents,
          recommendedPriceCents: plan.recommendedPriceCents,
          positioning,
          competitorPriceCount: competitorPricesCents.length,
          marketStats: plan.marketStats,
          confidence: plan.confidence,
          readinessMode: readiness.mode,
        })
      : null;

  const breakEvenPlan =
    plan.ok
      ? calculateBreakEvenPlan({
          recommendedPriceCents: plan.recommendedPriceCents,
          minimumViablePriceCents: plan.minimumViablePriceCents,
          effectivePriceCents: scenario.effectivePriceCents,
          monthlyUnits: numericValue(monthlyUnits),
          unitCostTotalCents,
          feePct: plan.feePct,
          adCostPerSaleCents: currencyToCents(adCost),
          fixedMonthlyCostsCents: currencyToCents(fixedCosts),
          returnRatePct: percentToRatio(returnRate),
          discountPct: percentToRatio(discount),
        })
      : null;
  const scenarioWarnings = [...scenario.warnings];
  if (plan.ok && scenario.effectivePriceCents < plan.minimumViablePriceCents) {
    scenarioWarnings.push("Discounted scenario price is below your minimum viable price.");
  }

  function saveScenario() {
    if (!breakEvenPlan) return;

    if (savedScenarios.length >= 3) {
      setScenarioLimitMessage("Compare up to 3 scenarios at a time. Remove one to save another.");
      return;
    }

    const name = DEFAULT_SCENARIO_NAMES[savedScenarios.length] ?? `Scenario ${savedScenarios.length + 1}`;
    setSavedScenarios((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        name,
        priceCents: activePriceCents,
        monthlyUnits: numericValue(monthlyUnits),
        discountPct: percentToRatio(discount),
        returnRatePct: percentToRatio(returnRate),
        adCostPerSaleCents: currencyToCents(adCost),
        fixedMonthlyCostsCents: currencyToCents(fixedCosts),
        netProfitCents: scenario.netProfitCents,
        breakEvenUnits: breakEvenPlan.breakEvenUnits,
        risk: breakEvenPlan.viability.risk,
      },
    ]);
    setScenarioLimitMessage("");
  }

  function removeScenario(id: string) {
    setSavedScenarios((current) => current.filter((savedScenario) => savedScenario.id !== id));
    setScenarioLimitMessage("");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Product economics</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Model unit costs, fees, target margin, and market references for a first launch price.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Unit cost" prefix="$" value={unitCost} onChange={setUnitCost} />
          <Field label="Shipping per order" prefix="$" value={shipping} onChange={setShipping} />
          <Field label="Packaging per order" prefix="$" value={packaging} onChange={setPackaging} />
          <Field label="Other unit costs" prefix="$" value={otherCosts} onChange={setOtherCosts} />
          <Field label="Payment fee percent" value={paymentFee} onChange={setPaymentFee} />
          <Field label="Platform fee percent" value={platformFee} onChange={setPlatformFee} />
          <Field label="Required margin percent" value={requiredMargin} onChange={setRequiredMargin} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-muted">
            Positioning
            <select
              value={positioning}
              onChange={(event) => setPositioning(event.target.value as LaunchPositioning)}
              className="field text-sm"
            >
              <option value="budget">Budget</option>
              <option value="mid-market">Mid-market</option>
              <option value="premium">Premium</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-muted">
            Rounding
            <select
              value={roundingMode}
              onChange={(event) => setRoundingMode(event.target.value as LaunchRoundingMode)}
              className="field text-sm"
            >
              <option value="ninety-nine">End in .99</option>
              <option value="whole">Whole dollars</option>
            </select>
          </label>
        </div>

        <label className="mt-4 grid gap-1 text-xs font-medium text-muted">
          Competitor prices
          <input
            aria-label="Competitor prices"
            value={competitors}
            onChange={(event) => setCompetitors(event.target.value)}
            placeholder="29, 35, 39, 42, 49"
            className="field text-sm"
          />
        </label>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h1 className="text-xl font-semibold text-ink">Launch Planner</h1>
        <div className="mt-4 rounded-lg border border-line bg-panel p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Launch Readiness</h2>
              <p className="mt-1 text-xs text-muted">{readiness.summary}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular text-ink">{readiness.score}</p>
              <p className="text-xs text-muted">score</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              {readiness.label}
            </span>
          </div>
          <div className="mt-3">
            <Field label="Sales data points" value={salesDataPoints} onChange={setSalesDataPoints} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">{readiness.nextStep}</p>
        </div>
        {plan.ok ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Recommended launch price</p>
              <p className="mt-1 text-4xl font-semibold tabular text-ink">
                {formatCents(plan.recommendedPriceCents)}
              </p>
              <p className="mt-3 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                {plan.confidence} confidence
              </p>
            </div>

            {explanation ? (
              <div className="mt-3 rounded-lg border border-line bg-panel p-3">
                <h2 className="text-sm font-semibold text-ink">Why this price?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{explanation.headline}</p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
                  {explanation.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Minimum viable price</dt>
                <dd className="mt-1 text-lg font-semibold tabular text-ink">
                  {formatCents(plan.minimumViablePriceCents)}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Stretch price</dt>
                <dd className="mt-1 text-lg font-semibold tabular text-ink">
                  {formatCents(plan.stretchPriceCents)}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Discount-safe floor</dt>
                <dd className="mt-1 text-lg font-semibold tabular text-ink">
                  {formatCents(plan.discountFloorPriceCents)}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-muted">Margin after fees</dt>
                <dd className="mt-1 text-lg font-semibold tabular text-ink">{pct(plan.grossMarginPct)}</dd>
              </div>
            </dl>

            {plan.warnings.length > 0 ? (
              <ul className="space-y-1 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                {plan.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {plan.error}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-ink">Scenario simulator</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Scenario price" prefix="$" value={scenarioPrice} onChange={setScenarioPrice} />
          <Field label="Expected monthly units" value={monthlyUnits} onChange={setMonthlyUnits} />
          <Field label="Ad cost per sale" prefix="$" value={adCost} onChange={setAdCost} />
          <Field label="Fixed monthly costs" prefix="$" value={fixedCosts} onChange={setFixedCosts} />
          <Field label="Return rate percent" value={returnRate} onChange={setReturnRate} />
          <Field label="Discount percent" value={discount} onChange={setDiscount} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Revenue" value={formatCents(scenario.revenueCents)} />
          <Stat label="Gross profit" value={formatCents(scenario.grossProfitCents)} />
          <Stat label="Net profit" value={formatCents(scenario.netProfitCents)} />
          <Stat label="Contribution" value={formatCents(scenario.contributionPerUnitCents)} />
          <Stat
            label="Break-even units"
            value={scenario.breakEvenUnits === null ? "No break-even" : String(scenario.breakEvenUnits)}
          />
          <Stat label="Margin" value={pct(scenario.marginPct)} />
        </div>

        {scenarioWarnings.length > 0 ? (
          <div className="mt-4 space-y-1 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {scenarioWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {breakEvenPlan ? (
          <div className="mt-5 rounded-lg border border-line bg-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Break-Even Plan</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">{breakEvenPlan.viability.explanation}</p>
              </div>
              <p className={`text-xs font-semibold uppercase ${riskClassName(breakEvenPlan.viability.risk)}`}>
                {breakEvenPlan.viability.risk} risk
              </p>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">{breakEvenPlan.viability.headline}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat
                label="Break-even units"
                value={breakEvenPlan.breakEvenUnits === null ? "Not reachable" : String(breakEvenPlan.breakEvenUnits)}
              />
              <Stat
                label="Max safe ad spend"
                value={
                  breakEvenPlan.maxSafeAdSpendCents === null
                    ? "No paid ads room"
                    : formatCents(breakEvenPlan.maxSafeAdSpendCents)
                }
              />
              <Stat label="Discount-safe price" value={formatCents(breakEvenPlan.discountSafePriceCents)} />
              <Stat
                label="Return stress"
                value={`${pct(breakEvenPlan.returnRateStress.testedReturnRatePct)} / ${formatCents(breakEvenPlan.returnRateStress.netProfitCents)}`}
              />
              <Stat
                label="Discount stress"
                value={`${pct(breakEvenPlan.discountStress.testedDiscountPct)} / ${formatCents(breakEvenPlan.discountStress.netProfitCents)}`}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-lg border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Saved Scenarios</h2>
              <p className="mt-1 text-xs text-muted">Compare up to three launch assumptions locally.</p>
            </div>
            <button type="button" onClick={saveScenario} className="btn btn-primary text-sm">
              Save Scenario
            </button>
          </div>
          {scenarioLimitMessage ? <p className="mt-3 text-sm text-danger">{scenarioLimitMessage}</p> : null}
          {savedScenarios.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Save a scenario to compare launch assumptions.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table aria-label="Saved launch scenarios" className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Scenario</th>
                    <th className="py-2 pr-3 font-medium">Price</th>
                    <th className="py-2 pr-3 font-medium">Units</th>
                    <th className="py-2 pr-3 font-medium">Discount</th>
                    <th className="py-2 pr-3 font-medium">Return rate</th>
                    <th className="py-2 pr-3 font-medium">Net profit</th>
                    <th className="py-2 pr-3 font-medium">Break-even</th>
                    <th className="py-2 pr-3 font-medium">Risk</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {savedScenarios.map((saved) => (
                    <tr key={saved.id} className="border-t border-line">
                      <td className="py-2 pr-3 font-medium text-ink">{saved.name}</td>
                      <td className="py-2 pr-3 tabular text-muted">{formatCents(saved.priceCents)}</td>
                      <td className="py-2 pr-3 tabular text-muted">{saved.monthlyUnits}</td>
                      <td className="py-2 pr-3 tabular text-muted">{pct(saved.discountPct)}</td>
                      <td className="py-2 pr-3 tabular text-muted">{pct(saved.returnRatePct)}</td>
                      <td className="py-2 pr-3 tabular text-muted">{formatCents(saved.netProfitCents)}</td>
                      <td className="py-2 pr-3 tabular text-muted">
                        {saved.breakEvenUnits === null ? "Not reachable" : saved.breakEvenUnits}
                      </td>
                      <td className={`py-2 pr-3 font-medium capitalize ${riskClassName(saved.risk)}`}>
                        {saved.risk}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeScenario(saved.id)}
                          className="text-xs font-medium text-danger"
                          aria-label={`Remove ${saved.name}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
