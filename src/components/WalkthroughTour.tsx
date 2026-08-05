"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { WALKTHROUGH_STEPS } from "@/lib/walkthrough/steps";

export function WalkthroughTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const step = WALKTHROUGH_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === WALKTHROUGH_STEPS.length - 1;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40" role="dialog" aria-modal="true" aria-label="Product walkthrough">
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
