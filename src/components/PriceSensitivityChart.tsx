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

  const cfg = CONFIDENCE_CONFIG[confidence];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted">
          Optimal price point{" "}
          <span className="font-medium tabular text-ink">{formatCents(optimalPricePoint)}</span>
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${cfg.text} ${cfg.bg}`}
        >
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

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

        {/* Acceptable range bounds */}
        <line x1={bandX} y1={AXIS_Y - 16} x2={bandX} y2={AXIS_Y + 16} stroke="currentColor" className="text-positive" strokeWidth={1.5} />
        <line x1={bandX + bandWidth} y1={AXIS_Y - 16} x2={bandX + bandWidth} y2={AXIS_Y + 16} stroke="currentColor" className="text-positive" strokeWidth={1.5} />

        {/* Indifference price point marker */}
        <circle cx={toX(indifferencePricePoint)} cy={AXIS_Y} r={5} className="fill-muted" />
        <text
          x={toX(indifferencePricePoint)}
          y={AXIS_Y + 30}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          {formatCents(indifferencePricePoint)}
        </text>

        {/* Optimal price point marker (headline) */}
        <circle cx={toX(optimalPricePoint)} cy={AXIS_Y} r={6} className="fill-ink" />
        <text
          x={toX(optimalPricePoint)}
          y={AXIS_Y - 24}
          textAnchor="middle"
          className="fill-ink text-[11px] font-semibold"
        >
          {formatCents(optimalPricePoint)}
        </text>

        {/* Axis endpoint labels */}
        <text x={MARGIN_X} y={AXIS_Y + 30} textAnchor="start" className="fill-faint text-[10px]">
          {formatCents(min)}
        </text>
        <text x={WIDTH - MARGIN_X} y={AXIS_Y + 30} textAnchor="end" className="fill-faint text-[10px]">
          {formatCents(max)}
        </text>
      </svg>

      <p className="mt-2 text-xs text-muted">
        Acceptable range{" "}
        <span className="font-medium tabular text-ink">
          {formatCents(acceptableRange.min)} – {formatCents(acceptableRange.max)}
        </span>
      </p>
    </div>
  );
}
