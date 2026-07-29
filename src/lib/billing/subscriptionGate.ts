const ACTIVE_STATUSES = new Set(["trialing", "active"]);

/**
 * Access is allowed only for "trialing" or "active" — every other status
 * (including "past_due") locks the dashboard, per the product decision to
 * use a hard lock rather than a dunning grace period.
 *
 * A "trialing" merchant also needs trialEndsAt checked directly: the
 * no-card trial has no Stripe subscription behind it, so there is no
 * webhook to flip subscriptionStatus away from "trialing" when the trial
 * window closes — this function is what actually enforces the expiry.
 */
export function hasActiveSubscription(status: string | null, trialEndsAt: Date | null): boolean {
  if (status === null || !ACTIVE_STATUSES.has(status)) return false;
  if (status === "trialing" && trialEndsAt !== null && trialEndsAt.getTime() <= Date.now()) {
    return false;
  }
  return true;
}
