import { afterEach, describe, expect, it } from "vitest";
import { getSearchProvider } from "./searchProvider";

const saved = { ...process.env };
afterEach(() => {
  process.env.BRAVE_SEARCH_API_KEY = saved.BRAVE_SEARCH_API_KEY;
  process.env.SEARCH_PROVIDER = saved.SEARCH_PROVIDER;
  if (saved.BRAVE_SEARCH_API_KEY === undefined) delete process.env.BRAVE_SEARCH_API_KEY;
  if (saved.SEARCH_PROVIDER === undefined) delete process.env.SEARCH_PROVIDER;
});

describe("getSearchProvider", () => {
  it("returns null when nothing is configured", () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.SEARCH_PROVIDER;
    expect(getSearchProvider()).toBeNull();
  });
  it("returns the fixture provider when SEARCH_PROVIDER=fixture", () => {
    process.env.SEARCH_PROVIDER = "fixture";
    expect(getSearchProvider()?.name).toBe("fixture");
  });
  it("returns the brave provider when a key is set", () => {
    delete process.env.SEARCH_PROVIDER;
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    expect(getSearchProvider()?.name).toBe("brave");
  });
  it("fixture wins over brave when both are set (explicit override)", () => {
    process.env.SEARCH_PROVIDER = "fixture";
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    expect(getSearchProvider()?.name).toBe("fixture");
  });
});
