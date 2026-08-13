"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { WALKTHROUGH_STEPS, type WalkthroughStep } from "@/lib/walkthrough/steps";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 6;

export function WalkthroughTour({
  onDone,
  onStepChange,
}: {
  onDone: () => void;
  onStepChange?: (step: WalkthroughStep) => void;
}) {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const step = WALKTHROUGH_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === WALKTHROUGH_STEPS.length - 1;
  const Icon = step.icon;

  useEffect(() => {
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // The target element may not exist yet (e.g. a tab switch triggered by the
  // onStepChange call above hasn't rendered it), so measure on a short delay
  // rather than synchronously, and keep re-measuring on resize/scroll.
  useEffect(() => {
    if (!step.targetId) {
      setTargetRect(null);
      return;
    }
    const measure = () => {
      const el = document.getElementById(step.targetId!);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = setTimeout(() => {
      document.getElementById(step.targetId!)?.scrollIntoView({ block: "center", behavior: "smooth" });
      measure();
    }, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [index, step.targetId]);

  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
        boxShadow: "0 0 0 9999px rgba(15, 15, 20, 0.55)",
      }
    : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Product walkthrough">
      {/* Click-blocking layer. Dimming itself comes from the spotlight's box-shadow
          when there's a target, so this stays transparent in that case rather than
          double-darkening the screen. */}
      <div className={`fixed inset-0 ${spotlightStyle ? "" : "bg-ink/40"}`} />
      {spotlightStyle && (
        <div
          className="fixed rounded-lg ring-2 ring-accent pointer-events-none transition-[top,left,width,height] duration-300"
          style={spotlightStyle}
        />
      )}

      <div className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Walkthrough · {index + 1} of {WALKTHROUGH_STEPS.length}
              </p>
              <p className="text-sm font-semibold text-ink">{step.title}</p>
            </div>
          </div>
          <button
            onClick={onDone}
            aria-label="Close walkthrough"
            className="shrink-0 text-faint hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm text-muted">{step.description}</p>

        <div className="mt-4 flex gap-1">
          {WALKTHROUGH_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= index ? "bg-ink" : "bg-panel"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="text-xs text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onDone} className="text-xs text-muted hover:text-ink transition-colors">
              Skip
            </button>
            <button
              onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
              className="btn btn-primary text-xs px-4 py-1.5"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
