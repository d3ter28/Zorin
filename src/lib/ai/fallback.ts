import type { Decision } from "../types";

const VERB: Record<Decision["action"], string> = {
  raise: "Consider raising this price.",
  lower: "Consider lowering this price.",
  hold: "Hold this price for now.",
};

export function fallbackPhrasing(decision: Decision): string {
  return `${VERB[decision.action]} ${decision.reasons.join(" ")}`.trim();
}
