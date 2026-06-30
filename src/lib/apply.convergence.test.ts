import { beforeEach, describe, expect, it, vi } from "vitest";

// Stateful prisma mock: a real store whose `update` mutates currentPrice, so a
// second applyDecision pass sees the price the first pass wrote. This exercises
// the genuine decide -> write -> re-decide loop that the bulk route runs, which
// the bulk route test can't (it mocks applyDecision). The FILTER-400 regression
// — a product needing two applies to settle — only shows up through this loop.

interface Row {
  id: string;
  currentPrice: number;
  cogs: number | null;
  competitors: { price: number; observedAt: Date }[];
}

const { store, findUnique, update, deleteMany } = vi.hoisted(() => {
  const store = new Map<string, { currentPrice: number; cogs: number | null; competitors: { price: number; observedAt: Date }[]; id: string }>();
  return {
    store,
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      return store.get(where.id) ?? null;
    }),
    update: vi.fn(
      async ({ where, data }: { where: { id: string }; data: { currentPrice: number } }) => {
        const row = store.get(where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    ),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique, update },
    recommendation: { deleteMany },
  },
}));

import { applyDecision } from "./apply";

const at = (price: number) => ({ price, observedAt: new Date("2026-06-28T00:00:00.000Z") });

const seed: Row[] = [
  // FILTER-400 shape: below BOTH the margin floor and the median -> must reach
  // the median in one apply, not stop at the floor and need a second pass.
  { id: "filter", currentPrice: 1000, cogs: 900, competitors: [at(1300), at(1400)] },
  // priced below median with healthy margin -> raise toward median
  { id: "scale", currentPrice: 6000, cogs: 2000, competitors: [at(4500), at(4800), at(5000)] },
  { id: "grinder", currentPrice: 4000, cogs: 1500, competitors: [at(5000), at(5200), at(4800)] },
  // priced above median -> lower toward median (clamped at floor)
  { id: "mug", currentPrice: 3000, cogs: 2200, competitors: [at(1800), at(1900), at(2000)] },
];

beforeEach(() => {
  store.clear();
  for (const row of seed) {
    store.set(row.id, { id: row.id, currentPrice: row.currentPrice, cogs: row.cogs, competitors: row.competitors });
  }
  findUnique.mockClear();
  update.mockClear();
  deleteMany.mockClear();
});

describe("bulk apply convergence (stateful)", () => {
  it("settles every product in a single pass: second pass writes nothing", async () => {
    const ids = seed.map((r) => r.id);

    // Pass 1: each product should move (it was mispriced).
    const pass1 = [];
    for (const id of ids) pass1.push(await applyDecision(id));
    for (const r of pass1) {
      expect(r.found).toBe(true);
      expect(r.applied).toBe(true);
    }

    // Pass 2: with pass-1 prices persisted, nothing should move — convergence.
    const pass2 = [];
    for (const id of ids) pass2.push(await applyDecision(id));
    for (const r of pass2) {
      expect(r.found).toBe(true);
      expect(r.applied).toBe(false);
      expect(r.action).toBe("hold");
    }
  });

  it("raises the FILTER-400 product straight to the median in one apply", async () => {
    const first = await applyDecision("filter");
    expect(first.applied).toBe(true);
    expect(first.action).toBe("raise");
    expect(first.currentPrice).toBe(1350); // median of [1300, 1400]
    expect(store.get("filter")!.currentPrice).toBe(1350);

    const second = await applyDecision("filter");
    expect(second.applied).toBe(false);
    expect(second.action).toBe("hold");
  });
});
