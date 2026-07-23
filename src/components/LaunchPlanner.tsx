"use client";

import { useMemo, useState } from "react";
import {
  calculateLaunchPlan,
  type LaunchPositioning,
  type LaunchRoundingMode,
} from "@/lib/launchPlanner/calculateLaunchPlan";
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
        {plan.ok ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Recommended launch price</p>
              <p className="mt-1 text-4xl font-semibold tabular text-ink">
                {formatCents(plan.recommendedPriceCents)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{plan.explanation}</p>
              <p className="mt-3 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                {plan.confidence} confidence
              </p>
            </div>

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

        {scenario.warnings.length > 0 ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{scenario.warnings[0]}</p>
        ) : null}
      </section>
    </div>
  );
}
