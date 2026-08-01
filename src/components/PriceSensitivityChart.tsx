import { formatCents } from "@/lib/money";
import type { VanWestendorpResult } from "@/lib/priceSurvey/vanWestendorp";

const CONFIDENCE_CONFIG: Record<
  VanWestendorpResult["confidence"],
  { label: string; dot: string; text: string; bg: string }
> = {
  good: { label: "Good confidence", dot: "bg-positive", text: "text-positive", bg: "bg-[color:oklch(0.96_0.04_150)]" },
  low: { label: "Low confidence", dot: "bg-warning", text: "text-warning", bg: "bg-[color:oklch(0.96_0.04_65)]" },
  none: { label: "No confidence", dot: "bg-faint", text: "text-faint", bg: "bg-panel" },
};

const WIDTH = 560;
const HEIGHT = 140;
const MARGIN_X = 24;
const AXIS_Y = 80;

export function PriceSensitivityChart({ result }: { result: VanWestendorpResult }) {
  const {
    pointOfMarginalCheapness,
    pointOfMarginalExpensiveness,
    optimalPricePoint,
    indifferencePricePoint,
    acceptableRange,
    confidence,
  } = result;

  const allValues = [
    pointOfMarginalCheapness,
    pointOfMarginalExpensiveness,
    optimalPricePoint,
    indifferencePricePoint,
    acceptableRange.min,
    acceptableRange.max,
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min;

  // Guard against a degenerate (zero-width) scale, e.g. all values equal.
  const toX = (value: number) => {
    if (span <= 0) return WIDTH / 2;
    const ratio = (value - min) / span;
    return MARGIN_X + ratio * (WIDTH - MARGIN_X * 2);
  };

  const rangeMinX = toX(acceptableRange.min);
  const rangeMaxX = toX(acceptableRange.max);
  const bandX = Math.min(rangeMinX, rangeMaxX);
  const bandWidth = Math.max(Math.abs(rangeMaxX - rangeMinX), 2);

  // A label centered on a marker near the chart's left/right edge would run off the
  // SVG and get clipped — anchor it to the near edge instead once it's within ~50px.
  const EDGE_GUARD = 50;
  function labelAnchor(x: number): "start" | "middle" | "end" {
    if (x < MARGIN_X + EDGE_GUARD) return "start";
    if (x > WIDTH - MARGIN_X - EDGE_GUARD) return "end";
    return "middle";
  }

  const cfg = CONFIDENCE_CONFIG[confidence];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted">Optimal price</p>
          <p className="text-lg font-semibold tabular text-ink">{formatCents(optimalPricePoint)}</p>
        </div>
        <span
          title="How reliable this result is, based on how many people responded"
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${cfg.text} ${cfg.bg}`}
        >
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        The price most of your customers see as fair — not too cheap to seem low-quality, not too
        expensive to pass on.
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Price sensitivity chart. Acceptable range ${formatCents(
          acceptableRange.min,
        )} to ${formatCents(acceptableRange.max)}. Optimal price point ${formatCents(
          optimalPricePoint,
        )}.`}
      >
        {/* Acceptable range band */}
        <rect
          x={bandX}
          y={AXIS_Y - 16}
          width={bandWidth}
          height={32}
          rx={4}
          className="fill-[color:oklch(0.96_0.04_150)]"
        />

        {/* Price axis/track */}
        <line
          x1={MARGIN_X}
          y1={AXIS_Y}
          x2={WIDTH - MARGIN_X}
          y2={AXIS_Y}
          stroke="currentColor"
          className="text-line"
          strokeWidth={2}
        />

        {/* Acceptable range bounds, with their own price labels */}
        <line x1={bandX} y1={AXIS_Y - 16} x2={bandX} y2={AXIS_Y + 16} stroke="currentColor" className="text-positive" strokeWidth={1.5} />
        <line x1={bandX + bandWidth} y1={AXIS_Y - 16} x2={bandX + bandWidth} y2={AXIS_Y + 16} stroke="currentColor" className="text-positive" strokeWidth={1.5} />
        <text x={bandX} y={AXIS_Y - 22} textAnchor={labelAnchor(bandX)} className="fill-positive text-[9px] font-medium">
          {formatCents(acceptableRange.min)}
        </text>
        <text x={bandX + bandWidth} y={AXIS_Y - 22} textAnchor={labelAnchor(bandX + bandWidth)} className="fill-positive text-[9px] font-medium">
          {formatCents(acceptableRange.max)}
        </text>

        {/* Indifference price point marker */}
        <circle cx={toX(indifferencePricePoint)} cy={AXIS_Y} r={5} className="fill-muted">
          <title>
            Indifference point ({formatCents(indifferencePricePoint)}) — the price where roughly
            equal numbers of customers called it &quot;good value&quot; vs &quot;getting
            expensive&quot;.
          </title>
        </circle>
        <text
          x={toX(indifferencePricePoint)}
          y={AXIS_Y + 32}
          textAnchor={labelAnchor(toX(indifferencePricePoint))}
          className="fill-muted text-[10px]"
        >
          Indifference · {formatCents(indifferencePricePoint)}
        </text>

        {/* Optimal price point marker (headline) */}
        <circle cx={toX(optimalPricePoint)} cy={AXIS_Y} r={6} className="fill-ink">
          <title>
            Optimal price ({formatCents(optimalPricePoint)}) — where roughly equal numbers of
            customers called it &quot;too cheap&quot; vs &quot;too expensive&quot;.
          </title>
        </circle>
        <text
          x={toX(optimalPricePoint)}
          y={AXIS_Y - 46}
          textAnchor={labelAnchor(toX(optimalPricePoint))}
          className="fill-ink text-[11px] font-semibold"
        >
          Optimal · {formatCents(optimalPricePoint)}
        </text>

        {/* Axis caption */}
        <text x={WIDTH / 2} y={AXIS_Y + 46} textAnchor="middle" className="fill-faint text-[10px]">
          Price customers said (low → high)
        </text>
      </svg>

      <div className="mt-4 space-y-1.5 text-[0.7rem] text-muted">
        <p className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink" />
          <span>
            <strong className="font-medium text-ink">Optimal price</strong> — where the fewest
            customers call it too cheap or too expensive.
          </span>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-muted" />
          <span>
            <strong className="font-medium text-ink">Indifference point</strong> — where opinion
            is most evenly split between &quot;good value&quot; and &quot;getting expensive&quot;.
          </span>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="h-2 w-3 shrink-0 rounded-sm bg-[color:oklch(0.85_0.08_150)]" />
          <span>
            <strong className="font-medium text-ink">Acceptable range</strong> — prices customers
            are unlikely to reject as either too cheap or too expensive.
          </span>
        </p>
      </div>

      <p className="mt-3 text-xs text-muted">
        Acceptable range{" "}
        <span className="font-medium tabular text-ink">
          {formatCents(acceptableRange.min)} – {formatCents(acceptableRange.max)}
        </span>
      </p>
    </div>
  );
}
