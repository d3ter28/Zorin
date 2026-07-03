import type { PrismaClient } from "@prisma/client";
import { refreshProduct as defaultRefreshProduct } from "./refreshProduct";
import type { RefreshSummary } from "./refreshProduct";

// Re-scrape a competitor price once it is older than this (well under the 14-day staleness cutoff).
export const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
export const TICK_MS = 60 * 60 * 1000;

type PrismaSurface = Pick<
  PrismaClient,
  "competitorPrice" | "competitorPriceObservation" | "recommendation"
>;

export async function findDueProductIds(
  prisma: PrismaSurface,
  now: Date = new Date(),
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - REFRESH_AFTER_MS);
  const rows = await prisma.competitorPrice.findMany({
    where: { competitorUrl: { not: null }, lastObservedAt: { lt: cutoff } },
    select: { productId: true },
  });
  return [...new Set(rows.map((r) => r.productId))];
}

export interface ScheduledRefreshResult {
  products: number;
  refreshed: number;
  failed: number;
}

interface TickDeps {
  refreshProduct?: typeof defaultRefreshProduct;
}

export async function runScheduledRefresh(
  prisma: PrismaSurface,
  now: Date = new Date(),
  deps: TickDeps = {},
): Promise<ScheduledRefreshResult> {
  const refreshProduct = deps.refreshProduct ?? defaultRefreshProduct;
  const ids = await findDueProductIds(prisma, now);

  let refreshed = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const s = await refreshProduct(prisma, id);
      refreshed += s.refreshed;
      failed += s.failed;
    } catch {
      failed++; // one bad product must not stop the rest of the tick
    }
  }

  console.log(`[auto-refresh] ${ids.length} products: refreshed ${refreshed}, failed ${failed}`);
  return { products: ids.length, refreshed, failed };
}

const FIRST_TICK_DELAY_MS = 30_000;

interface StartDeps {
  // Injectable so timer tests never touch prisma or the network.
  runTick?: () => Promise<unknown>;
}

let started = false;
let inFlight = false;
let timers: Array<ReturnType<typeof setTimeout>> = [];

async function defaultRunTick(): Promise<unknown> {
  // Lazy import so merely loading this module never opens the SQLite file.
  const { prisma } = await import("../db");
  return runScheduledRefresh(prisma, new Date());
}

export function startAutoRefresh(deps: StartDeps = {}): void {
  if (started) return; // Next dev can invoke register() more than once
  if (process.env.AUTO_REFRESH === "0") return;
  started = true;

  const runTick = deps.runTick ?? defaultRunTick;
  const tick = async () => {
    if (inFlight) return; // previous tick still running — skip this one
    inFlight = true;
    try {
      await runTick();
    } catch (err) {
      console.error("[auto-refresh] tick failed:", err);
    } finally {
      inFlight = false;
    }
  };

  timers.push(setTimeout(tick, FIRST_TICK_DELAY_MS));
  timers.push(setInterval(tick, TICK_MS));
}

export function _resetAutoRefreshForTests(): void {
  for (const t of timers) clearTimeout(t as NodeJS.Timeout);
  timers = [];
  started = false;
  inFlight = false;
}
