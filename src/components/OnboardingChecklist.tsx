"use client"
import { useEffect } from "react"
import Link from "next/link"
import { CheckCircle, Circle, X } from "@phosphor-icons/react"

interface OnboardingChecklistProps {
  hasProducts: boolean
  hasModels: boolean
  hasAppliedPrice: boolean
  onDismiss: () => void
  onGoToProducts: () => void
  firstProductWithoutModel?: string
  firstProductWithRecommendation?: string
}

export function OnboardingChecklist({
  hasProducts,
  hasModels,
  hasAppliedPrice,
  onDismiss,
  onGoToProducts,
  firstProductWithoutModel,
  firstProductWithRecommendation,
}: OnboardingChecklistProps) {
  const steps = [
    {
      done: hasProducts,
      title: "Import your products",
      desc: "Upload a CSV of your catalog to get started.",
    },
    {
      done: hasModels,
      title: "Fit your first model",
      desc: "Run the elasticity model on a product with sales history.",
    },
    {
      done: hasAppliedPrice,
      title: "Apply your first price",
      desc: "Review a recommendation and apply it to your store.",
    },
  ]
  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === 3
  const currentStepIndex = steps.findIndex((s) => !s.done) // -1 if all done

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(onDismiss, 2500)
      return () => clearTimeout(t)
    }
  }, [allDone, onDismiss])

  return (
    <div className="mb-6 rounded-xl border border-line bg-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-accent">◆</span>
          <span className="text-sm font-semibold text-ink">Get started with PriceIQ</span>
          <span className="text-xs text-muted ml-1">{completedCount} of {steps.length}</span>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss onboarding checklist" className="text-faint hover:text-ink transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* All done state */}
      {allDone && (
        <p className="text-sm text-positive">You&apos;re all set! Redirecting...</p>
      )}

      {/* Steps */}
      {!allDone && (
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isCurrent = i === currentStepIndex
            const isFuture = i > currentStepIndex
            return (
              <div key={i} className={`flex items-start gap-3 ${isFuture ? "opacity-40" : ""}`}>
                {/* Icon */}
                {step.done ? (
                  <CheckCircle size={18} weight="fill" className="text-positive shrink-0 mt-0.5" />
                ) : (
                  <Circle
                    size={18}
                    className={`${isCurrent ? "text-accent" : "text-faint"} shrink-0 mt-0.5`}
                  />
                )}
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? "text-muted line-through" : "text-ink"}`}>
                    {step.title}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-muted mt-0.5">{step.desc}</p>
                  )}
                  {/* CTA — only on current step */}
                  {isCurrent && (
                    <div className="mt-2">
                      {i === 0 && (
                        <button onClick={onGoToProducts} className="btn btn-ghost text-xs px-3 py-1">
                          Go to Products →
                        </button>
                      )}
                      {i === 1 && firstProductWithoutModel && (
                        <Link href={`/product/${firstProductWithoutModel}`} className="btn btn-ghost text-xs px-3 py-1">
                          Open a product →
                        </Link>
                      )}
                      {i === 2 && firstProductWithRecommendation && (
                        <Link href={`/product/${firstProductWithRecommendation}`} className="btn btn-ghost text-xs px-3 py-1">
                          View recommendation →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress bar */}
      {!allDone && (
        <div className="mt-4 h-1 rounded-full bg-panel overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
