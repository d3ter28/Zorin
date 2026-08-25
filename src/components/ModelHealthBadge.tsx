interface Props {
  r2: number | null;
  dataPoints: number | null;
  confidenceScore?: number | null;
  isFallback?: boolean;
  size?: "sm" | "md";
}

type Tier = "strong" | "fair" | "weak" | "none" | "estimated";

function getTier(
  r2: number | null | undefined,
  dataPoints: number | null | undefined,
  confidenceScore?: number | null,
  isFallback?: boolean
): Tier {
  // Categorical flag, not a point on the numeric confidence scale — checked
  // before any r2/confidenceScore logic so a fallback rec is never mistaken
  // for a real per-SKU fit, no matter how strong its borrowed stats look.
  if (isFallback) return "estimated";
  if (r2 == null || dataPoints == null) return "none";
  if (confidenceScore != null) {
    if (confidenceScore >= 0.7) return "strong";
    if (confidenceScore >= 0.4) return "fair";
    return "weak";
  }
  // Legacy fallback when confidenceScore not yet stored
  if (r2 >= 0.7 && dataPoints >= 30) return "strong";
  if (r2 >= 0.5 && dataPoints >= 10) return "fair";
  return "weak";
}

const TIER_CONFIG: Record<Tier, { label: string; dot: string; text: string; bg: string }> = {
  strong: { label: "Strong", dot: "bg-positive",  text: "text-positive", bg: "bg-[color:oklch(0.96_0.04_150)]" },
  fair:   { label: "Fair",   dot: "bg-warning",   text: "text-warning",  bg: "bg-[color:oklch(0.96_0.04_65)]"  },
  weak:   { label: "Weak",   dot: "bg-danger",    text: "text-danger",   bg: "bg-danger-soft"                   },
  none:   { label: "No model", dot: "bg-faint",   text: "text-faint",    bg: "bg-panel"                         },
  estimated: { label: "Estimated", dot: "bg-accent", text: "text-accent", bg: "bg-accent-soft"                  },
};

export function ModelHealthBadge({ r2, dataPoints, confidenceScore, isFallback, size = "md" }: Props) {
  const tier = getTier(r2, dataPoints, confidenceScore, isFallback);
  const cfg = TIER_CONFIG[tier];

  const title =
    tier === "estimated"
      ? "Estimated from similar products — not this SKU's own sales history"
      : tier === "none"
      ? "No elasticity model fitted yet"
      : confidenceScore != null
        ? `Confidence: ${Math.round(confidenceScore * 100)}% · R²=${r2?.toFixed(2) ?? "?"}, ${dataPoints} data points`
        : `R²=${r2?.toFixed(2) ?? "?"}, ${dataPoints} data points`;

  if (size === "sm") {
    return (
      <span title={title} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] font-medium ${cfg.text} ${cfg.bg}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }

  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${cfg.text} ${cfg.bg}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}{tier !== "none" && tier !== "estimated" && " fit"}
      {tier !== "none" && tier !== "estimated" && (
        <span className="ml-0.5 font-normal opacity-70">
          {confidenceScore != null
            ? `· ${Math.round(confidenceScore * 100)}% conf`
            : `· R²=${r2?.toFixed(2) ?? "?"} · ${dataPoints} pts`}
        </span>
      )}
    </span>
  );
}
