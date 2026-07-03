import type { SearchProvider } from "./searchProvider";

export function makeBraveProvider(apiKey: string): SearchProvider {
  void apiKey;
  return {
    name: "brave",
    async search() {
      return { ok: false, reason: "unavailable" };
    },
  };
}
