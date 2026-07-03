import { describe, expect, it } from "vitest";
import { fixtureProvider } from "./fixtureProvider";

describe("fixtureProvider", () => {
  it("returns the local demo page as a result for any query", async () => {
    const res = await fixtureProvider.search("Ceramic Mug 12oz");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].url).toBe("http://localhost:3000/demo-competitor.html");
    expect(res.results[0].title).toContain("LocalDemoShop");
  });
});
