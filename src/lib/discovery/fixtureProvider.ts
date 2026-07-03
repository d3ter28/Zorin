import type { SearchProvider } from "./searchProvider";

// Canned results for demo/dev without a Brave key (SEARCH_PROVIDER=fixture).
// Points at the committed local demo page so the full discover → confirm →
// auto-refresh loop works offline. Scraping localhost requires the existing
// dev bypass (NODE_ENV !== "production" or SCRAPE_ALLOW_PRIVATE=1).
export const fixtureProvider: SearchProvider = {
  name: "fixture",
  async search() {
    return {
      ok: true,
      results: [
        {
          url: "http://localhost:3000/demo-competitor.html",
          title: "Ceramic Coffee Mug 12oz — LocalDemoShop",
          snippet: "Buy the 12oz ceramic coffee mug at LocalDemoShop.",
        },
      ],
    };
  },
};
