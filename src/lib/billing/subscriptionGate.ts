const ACTIVE_STATUSES = new Set(["trialing", "active"]);

/**
 * Access is allowed only for "trialing" or "active" — every other status
 * (including "past_due") locks the dashboard, per the product decision to
 * use a hard lock rather than a dunning grace period.
 */
export function hasActiveSubscription(status: string | null): boolean {
  return status !== null && ACTIVE_STATUSES.has(status);
}
