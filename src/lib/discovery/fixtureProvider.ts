import type { SearchProvider } from "./searchProvider";

export const fixtureProvider: SearchProvider = {
  name: "fixture",
  async search() {
    return { ok: true, results: [] };
  },
};
