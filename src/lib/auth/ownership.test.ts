import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api/errors";
import { assertProductOwned, filterOwnedProductIds } from "./ownership";

const findUnique = vi.fn();
const findMany = vi.fn();
const prisma = { product: { findUnique, findMany } } as unknown as PrismaClient;

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
});

describe("assertProductOwned", () => {
  it("passes when the product belongs to the merchant", async () => {
    findUnique.mockResolvedValue({ merchantId: "m1" });
    await expect(assertProductOwned(prisma, "p1", "m1")).resolves.toBeUndefined();
  });

  it("throws 404 for a foreign product (no existence leak)", async () => {
    findUnique.mockResolvedValue({ merchantId: "m2" });
    await expect(assertProductOwned(prisma, "p1", "m1")).rejects.toMatchObject(
      new HttpError(404, "Not found"),
    );
  });

  it("throws 404 for a missing product", async () => {
    findUnique.mockResolvedValue(null);
    await expect(assertProductOwned(prisma, "gone", "m1")).rejects.toMatchObject(
      new HttpError(404, "Not found"),
    );
  });
});

describe("filterOwnedProductIds", () => {
  it("keeps only ids owned by the merchant", async () => {
    findMany.mockResolvedValue([{ id: "p1" }, { id: "p3" }]);
    await expect(
      filterOwnedProductIds(prisma, ["p1", "p2", "p3"], "m1"),
    ).resolves.toEqual(["p1", "p3"]);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1", "p2", "p3"] }, merchantId: "m1" },
      select: { id: true },
    });
  });

  it("returns empty for an empty input without querying", async () => {
    await expect(filterOwnedProductIds(prisma, [], "m1")).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
