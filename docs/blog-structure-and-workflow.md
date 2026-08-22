# Zorin Blog: Structure & Workflow

Reference doc for how the Zorin blog is built, styled, and maintained. Last updated 2026-08-21 (cluster/pagination architecture added).

## Where it lives

- Content: `src/lib/blog/posts.ts` — a static TypeScript array (`BlogPost[]`), not a CMS. Add a post by prepending an object to the `posts` array.
- `BlogPost` fields beyond the basics: `updatedDate?` (sets `dateModified` in Article schema and sitemap `lastModified` — set this when substantively editing an old post), `ogImage?` (root-relative path, falls back to `/og-default.png`, which does not yet exist as an asset), `canonicalSlug?` (set on an older duplicate/cannibal post to point its canonical tag at the newer post instead of itself).
- Rendering (restructured 2026-08-21, see "Topic clusters & pagination" below): `src/app/blog/page.tsx` is now a pure topic browser (cluster cards only), `src/app/blog/all/page.tsx` holds the full paginated chronological list, `src/app/blog/cluster/[slug]/page.tsx` is a per-cluster hub, and `src/app/blog/[slug]/page.tsx` is the individual post. The post page also auto-inserts a mid-article CTA banner (added 2026-08-21) for any post with 4+ `<h2>` sections, splitting the content at the middle `<h2>` — no per-post markup needed, this is template-level.
- Sitemap: `src/app/sitemap.ts` auto-generates blog routes from `posts.ts` (`lastModified` = `updatedDate ?? date`), cluster hub routes from `clusters.ts`, plus `/blog/all` and a hardcoded list of static marketing pages. **Keep post dates ≤ today** — a future-dated post can defer Googlebot crawling; this bit twice already (2026-08-21) from posts pre-dated for a staggered-publish look.
- Schema: `src/lib/blog/schema.ts` auto-generates `Article` and `FAQPage` JSON-LD per post using `cheerio` to parse the `.faq-item` markup out of the post's HTML. Wired into `src/app/blog/[slug]/page.tsx` alongside a `BreadcrumbList` block (added 2026-08-21). This runs for every post automatically, but it depends on the FAQ markup structure being exact (see below).
- Every public page (blog posts and marketing pages) now carries `alternates: { canonical: ... }` (site-wide pass completed 2026-08-21) — home, `/blog`, `/features` + subpages, integrations, calculators, `/terms`, `/privacy`, `/about`. No trailing slash on the homepage canonical, matching the sitemap's `BASE_URL` convention.
- Styling: all post CSS classes are pre-defined in `src/app/globals.css` (search `.prose-content`). Posts should never use inline `style=` attributes — write plain semantic HTML and let the site's CSS handle it.
- Images: `public/images/blog/*.webp` (converted from PNG 2026-08-21, ~1MB → ~404KB total). All `<img>` tags carry real `width`/`height`; the first image per post loads `eager`/`fetchpriority="high"`, the rest stay `lazy`.

## Product mechanism (get this right before writing anything)

Zorin is an ML elasticity-modeling tool: a merchant connects Shopify/WooCommerce or uploads sales history, the app fits a log-log regression per SKU, and returns a raise/lower/hold recommendation with an R-squared/confidence score and estimated profit lift.

Separately, Zorin ships a **Van Westendorp Price Sensitivity Meter** — a 4-question customer survey producing PMC/PME/OPP/IPP price points with a confidence tier based on response count. This is stated-preference research, kept conceptually distinct from the elasticity model's revealed-preference recommendation. Don't conflate the two.

**Competitor pricing (added as a real feature, corrected in docs 2026-08-21):** Zorin does **not** automatically scrape or live-monitor competitor sites — it is not a Prisync/Price2Spy-style automated tracker. It does have a manual competitor-price feature: on any product page, add a competitor name, price, and optional URL (as many as needed per product); Zorin calculates min/median/max across entries and feeds them into the Launch Planner automatically. The distinction that matters for content: "competitor price intelligence software," "competitor price tool," and "price intelligent software" are the wrong keyword cluster to target (that's the automated-scraping category, a different product), but "competitor price comparison" is a reasonable fit since the manual min/median/max feature genuinely does that. The blog post `do-you-need-a-competitor-price-tracking-app` previously claimed Zorin "explicitly does not scrape or compare against competitor prices" at all — this was factually wrong once the manual feature shipped and was corrected 2026-08-21.

This has been a recurring failure mode with user-supplied draft guides that describe an older, wrong product concept. Always fact-check product claims in any supplied draft — and periodically re-check the blog's own older posts — against the actual shipped feature set before restructuring or trusting them.

## Required structure for every post

Every post's `content` HTML must include, in order:

1. **Intro** — `<p class="intro">...</p>`, answer-first, renders as a highlighted blue callout box. This is the first thing a reader sees; if the post opens with a story/hook, the story belongs here, not further down the page.
2. **Body sections** — `<h2>`/`<h3>` sections grounded in the real product mechanism. Each section should ideally open with a crisp, self-contained, quotable sentence (helps both SEO and LLM/GEO citation — see "SEO/GEO notes" below).
3. **At least one `<table>`** somewhere in the body.
4. **A product screenshot** — `<figure class="post-image"><img src="/images/blog/....png" alt="..." loading="lazy" /><figcaption>...</figcaption></figure>`. Every post needs at least one real screenshot, never stock art or none. Available images live in `public/images/blog/`.
5. **Internal links** — 2-3 contextual links worked into body prose. See "Internal linking policy" below for current guidance.
6. **Key Takeaways** — `<div class="key-takeaways"><p class="kt-label">Key Takeaways</p><ul>...5 items...</ul></div>`. Current convention (since 2026-08-08): positioned as a closing recap right before the FAQ section, not directly after the intro.
7. **FAQ section** — `<section class="faq"><h2>Frequently Asked Questions</h2><div class="faq-item"><h3>...</h3><p>...</p></div>...</section>`, 6-10 Q&As. **This exact markup is parsed programmatically** by `schema.ts` to build FAQPage JSON-LD — don't deviate from `.faq-item > h3` / `.faq-item > p`.
8. **CTA** — a soft link to `/signup` (or another relevant product page, see below) near the close.
9. **Conclusion** — `<p class="conclusion">...</p>`.

Other hard rules:
- **No em-dashes anywhere.** Checked before every commit.
- No fixed word cap — aim for real depth (~2,000+ words where the topic supports it).
- Real, verifiable citations via web research where a stat is used, not vague `(source: X, 2026)` placeholders. Watch for leftover `<cite index="...">` markup in supplied drafts, and for stats attributed to a secondary site that's itself just quoting a primary source (e.g. a stat attributed to a marketing blog that's actually McKinsey's research) — reattribute to the original source once verified.

## Author / bio feature (added 2026-08-11)

`BlogPost` has an optional `author?: { name: string; bio: string }` field (`src/lib/blog/posts.ts`). When set:
- Renders "By {name}" in the byline next to the date (`src/app/blog/[slug]/page.tsx`).
- Renders a bio card ("Written by {name}" + bio text) after the article content.
- `schema.ts`'s Article JSON-LD uses a real `Person` author instead of falling back to the `Zorin` Organization.

All 47 current posts are attributed to `{ name: "Dexter", bio: "Dexter is part of the team at Zorin, building tools that help ecommerce merchants price with data instead of guesswork." }` — this is now the default for every new post unless a real guest author is specified. The field exists specifically to support guest-post attribution; use a different name/bio when a post is genuinely guest-written.

## Internal linking policy (updated 2026-08-08, reinforced 2026-08-16)

Previous posts (through 2026-08-08) defaulted almost every non-blog link to `/signup`. Current practice:

- Don't route every link to the homepage or `/signup` by default — spread links across other relevant pages so authority isn't all funneled to one URL.
- Use descriptive, keyword-rich anchor text tied to the destination page's topic, not generic phrases like "click here" or "learn more." Vary anchor text across different links even when pointing at the same page.
- A handful of well-placed, contextually relevant links beats stuffing many links into one post — don't over-link.
- Beyond other blog posts, real internal targets on the site to link into from relevant posts:
  - `/shopify-profit-margin-calculator` — free tool, good fit for margin/profit-focused posts
  - `/integrations/shopify` and `/integrations/woocommerce` — good fit for posts about connecting sales data
  - `/guide` — general onboarding/how-it-works page
  - `/signup` — still fine as one of the links, just not the only non-blog destination every time
- **On 2026-08-12, all 30 posts published up to that point were audited and fixed**: 11 posts were orphaned (zero incoming internal blog links) and 6 had only the `/signup` link with no blog-to-blog links at all. Fixed by adding contextual links from the under-linked posts to the orphans. As of that audit, every post has at least one incoming and one outgoing blog-to-blog link, and there are zero broken internal links. Re-run this kind of audit periodically as new posts accumulate — it's a simple regex pass over `posts.ts` extracting `href="/blog/..."` links and cross-referencing against the slug list (see conversation history for the exact script if needed).

## Topic clusters & pagination (built 2026-08-21)

The informal pillar/cluster map that used to live only in this doc is now real, live site architecture in `src/lib/blog/clusters.ts` — a `Cluster[]` array of `{ slug, name, description, postSlugs }`. This is the **single source of truth** for cluster membership; update this doc's summary below if it drifts, but `clusters.ts` is what actually renders.

**8 clusters, all 47 posts accounted for exactly once** (cross-checked with a script — no duplicates, no orphans left out):

1. **Price Elasticity** (13 posts) — the core/largest cluster. Pillar: `what-does-price-elasticity-actually-mean`.
2. **Pricing Tools & Software** (8 posts) — buyer's guides and comparisons, including `how-to-evaluate-a-shopify-pricing-app`.
3. **Discounts & Promotions** (4 posts) — sales, bundles, dynamic pricing.
4. **Margin & Profit Fundamentals** (6 posts) — gross/net margin benchmarks and where profit leaks.
5. **Price Sensitivity Surveys** (4 posts) — the Van Westendorp cluster: `how-do-i-know-what-price-my-customers-are-willing-to-pay`, `how-to-run-a-price-sensitivity-survey`, `how-to-interpret-van-westendorp-results`, `price-survey-vs-price-testing`. No longer a single orphan post — this is now a real 4-post cluster.
6. **Multi-Channel & Launch Pricing** (4 posts) — Shopify vs Amazon pricing, new-product launch pricing.
7. **Pricing Fundamentals & Strategy** (6 posts) — the catch-all for broad strategy questions (charm pricing, review cadence, competitor positioning), anchored by the new pillar `ecommerce-pricing-strategy-the-complete-guide`.
8. **Vertical-Specific Pricing** (2 posts) — `pricing-skincare-products-on-shopify-charging-enough`, `how-to-price-clothing-on-shopify`. Small but real; a natural place to add apparel/supplements/home-goods follow-ons.

**Site architecture built on top of this:**
- `/blog` — pure topic browser now: 8 cluster cards (name, description, post count) plus a "View all posts" button. No longer shows the chronological list directly.
- `/blog/all` — the full chronological list, paginated 12/page via a shared `Pagination` component (`src/components/marketing/Pagination.tsx`).
- `/blog/cluster/[slug]` — one hub page per cluster, same 12/page pagination, own `BreadcrumbList` schema and per-page canonical (`?page=N` for page 2+).
- All cluster + `/blog/all` URLs are in the sitemap.

**How to apply when adding a new post:** after adding the post to `posts.ts`, also add its slug to the matching cluster's `postSlugs` array in `clusters.ts`. This is a manual step with nothing enforcing it — a post left out of every cluster still lives at its own URL and in `/blog/all`, but won't surface under any topic page. Worth periodically re-running the cross-check (every `posts.ts` slug appears in exactly one cluster) as the count grows; a build-time check that fails on an unclustered post has been discussed but not yet built.

## Current post list (47 posts, newest first, as of 2026-08-21)

| Date | Slug | Category |
|---|---|---|
| 2026-08-21 | `price-survey-vs-price-testing` | Product |
| 2026-08-21 | `how-to-interpret-van-westendorp-results` | Product |
| 2026-08-21 | `how-to-price-clothing-on-shopify` | Pricing Strategy |
| 2026-08-21 | `how-to-evaluate-a-shopify-pricing-app` | Product |
| 2026-08-21 | `ecommerce-pricing-strategy-the-complete-guide` | Pricing Strategy |
| 2026-08-21 | `how-to-run-a-price-sensitivity-survey` (retitled "How to Run a Van Westendorp Survey", slug unchanged) | Product |
| 2026-08-21 | `how-to-price-a-new-product-from-launch-to-end-of-life` | Pricing Strategy |
| 2026-08-21 | `should-you-price-the-same-on-shopify-and-amazon` | Pricing Strategy |
| 2026-08-21 | `what-your-price-elasticity-score-actually-means` | Pricing Strategy |
| 2026-08-20 | `dynamic-pricing-vs-sales-a-shopify-sellers-guide` | Pricing Strategy |
| 2026-08-19 | `ecommerce-profit-margins-what-to-target-and-how-to-track-them` | Pricing Strategy |
| 2026-08-18 | `pricing-skincare-products-on-shopify-charging-enough` | Pricing Strategy |
| 2026-08-17 | `how-to-price-product-bundles-without-giving-away-your-margin` | Pricing Strategy |
| 2026-08-16 | `do-you-need-a-competitor-price-tracking-app` | Product |
| 2026-08-15 | `best-pricing-optimization-tools-for-shopify-stores-2026` | Product |
| 2026-08-14 | `price-elasticity-tools-for-ecommerce-how-to-find-your-best-price` | Product |
| 2026-08-13 | `how-to-know-if-your-prices-are-too-high-or-too-low` | Pricing Strategy |
| 2026-08-12 | `price-elasticity-vs-repricing-software` | Product |
| 2026-08-11 | `price-increase-killed-your-sales-heres-the-real-reason` | Pricing Strategy |
| 2026-08-10 | `how-to-calculate-price-elasticity-for-your-shopify-store` | Education |
| 2026-08-09 | `best-price-optimization-app-for-small-shopify-stores` | Product |
| 2026-08-08 | `how-do-i-calculate-my-own-price-elasticity-without-a-data-scientist` | Education |
| 2026-08-07 | `how-to-automate-pricing-updates-across-your-shopify-store` | Product |
| 2026-08-06 | `elastic-vs-inelastic-demand-whats-the-difference` | Education |
| 2026-08-05 | `why-do-some-products-have-more-elastic-demand-than-others` | Education |
| 2026-08-04 | `price-elasticity-examples-by-ecommerce-category` | Education |
| 2026-08-03 | `price-elasticity-explained-a-guide-for-ecommerce-sellers` | Education |
| 2026-08-03 | `how-to-price-a-discount-without-losing-your-margin` | Pricing Strategy |
| 2026-08-01 | `how-do-i-know-what-price-my-customers-are-willing-to-pay` | Product |
| 2026-07-31 | `should-you-price-below-at-or-above-your-competitors` | Pricing Strategy |
| 2026-07-31 | `does-charm-pricing-999-actually-work` | Education |
| 2026-07-30 | `woocommerce-pricing-apps-what-to-look-for` | Product |
| 2026-07-30 | `why-do-my-bestsellers-and-slow-sellers-need-different-pricing-strategies` | Pricing Strategy |
| 2026-07-30 | `do-i-need-a-data-analyst-to-price-my-products-well` | Education |
| 2026-07-30 | `whats-a-good-profit-margin-for-an-online-store` | Education |
| 2026-07-30 | `should-i-raise-prices-to-cover-rising-costs` | Pricing Strategy |
| 2026-07-30 | `how-do-i-set-prices-for-my-whole-catalog-without-doing-it-one-by-one` | Product |
| 2026-07-29 | `how-much-should-i-trust-an-ai-pricing-recommendation` | Education |
| 2026-07-29 | `what-does-price-elasticity-actually-mean` | Education |
| 2026-07-29 | `how-do-i-price-a-new-product-with-no-sales-history` | Pricing Strategy |
| 2026-07-29 | `why-did-my-sales-drop-when-i-raised-my-price` | Pricing Strategy |
| 2026-07-29 | `how-often-should-i-change-my-prices` | Pricing Strategy |
| 2026-07-28 | `how-do-i-know-what-to-price-my-products` | Education |
| 2026-07-28 | `is-your-store-leaving-money-on-the-table` | Pricing Strategy |
| 2026-07-28 | `should-you-price-differently-on-shopify-vs-amazon` | Pricing Strategy |
| 2026-07-28 | `shopify-pricing-apps-what-to-look-for` | Product |
| 2026-07-28 | `how-to-run-a-sale-without-wrecking-your-margin` | Pricing Strategy |

## Content cluster backlog

The Price Elasticity, Discounts & Promotions, and Margin & Profit Fundamentals clusters are all well-developed (see cluster list above). Genuinely thin spots:

- **Vertical-Specific Pricing** — only 2 posts (skincare, apparel). Natural next categories: supplements, home goods, jewelry/accessories.
- Older unwritten backlog items, still open: **"Why Did My Price Increase Not Hurt Sales At All?"** (elasticity cluster follow-up), **"How Do I Know If My Last Price Increase Actually Worked?"** (profit-per-visitor framework), **"How Much Profit Am I Losing by Underpricing My Bestsellers?"**, **"How Do I Price Products With High Return Rates?"** (true-landed-cost angle).

**5 posts added 2026-08-21** (same day, via 3 separate user-supplied drafts plus 2 written from scratch): `ecommerce-pricing-strategy-the-complete-guide` (new pillar for the Pricing Fundamentals & Strategy cluster), `how-to-evaluate-a-shopify-pricing-app`, `how-to-price-clothing-on-shopify` (required correcting a stale tariff claim — see git history), `how-to-interpret-van-westendorp-results` (first post with an original hand-built SVG diagram), `price-survey-vs-price-testing` (corrected an imprecise Robinson-Patman Act claim from the source draft; second post with an original diagram).

**Guest post submitted**: an article on price elasticity for ecommerce was submitted to Bridge Homies (bridgehomies.com) as a guest post with a dofollow backlink to tryzorin.com using the anchor text "price elasticity software" — a query already showing Zorin at position 9.8 in GSC. Post body link only; author bio is plain text. Pending publication.

**4 more guest posts written but not yet submitted anywhere** (one per target site — SaaSClue, eCommerce Nation, tryforward.io, SaasTrac), each with one dofollow link to a specific Zorin post per that site's link policy. tryforward.io explicitly screens for AI-written content, so that one likely needs a human rewrite pass before submission.

## Publishing cadence

Standing decision (made 2026-07-30, overriding an earlier "pause until 2026-08-13" recommendation): publish roughly 1 new post per 1-2 days. This is an informed, deliberate risk acceptance for content velocity given the domain's zero-backlink/young-domain state — not something to re-flag per post.

## Workflow: writing/restructuring a post

1. **Fact-check product-mechanism claims** against the "Product mechanism" section above, especially for any user-supplied draft. Flag corrections to the user rather than silently fixing them.
2. **Verify cited stats** via web search before keeping vague placeholder attributions; strip any leftover citation markup (e.g. `<cite index="...">`) and replace with natural prose citing the real, original source. Also verify specific factual claims about named competitors (pricing tiers, ratings, review counts, customer names) when a supplied draft states them — these have repeatedly needed correction (wrong competitor counts, unconfirmed customer names, review-count claims that don't match any live source, fabricated-sounding stats). Where sources genuinely conflict (e.g. wildly different star ratings across review aggregators for the same app), don't publish a specific number you can't confidently verify — soften the claim instead.
3. **Convert to the site's structure** (see "Required structure" above) — add a table if the draft doesn't have one, add a screenshot, add internal links (per the current linking policy, including a link to the relevant pillar post if one exists), keep the substantive advice from a supplied draft as-is unless something is factually wrong.
4. **Watch for embedded promotional/reciprocal links** in supplied drafts — treat as a flag-and-ask situation, not a silent pass-through. (One past draft embedded a link to an unrelated company's blog in exchange for a reciprocal backlink; kept per explicit user instruction, but reciprocal link exchanges run against the standing backlink plan's own "skip" list.)
5. **Verify before committing**:
   - No em-dashes: `grep -n $'—' src/lib/blog/posts.ts`
   - Type check: `npx tsc --noEmit` (filter output for `posts.ts` — the repo has pre-existing unrelated test-file errors)
   - Local preview: start the dev server, navigate to `/blog/<slug>`, check intro/key-takeaways/H2s/table/image/FAQ count/internal links, confirm no console errors, confirm `FAQPage` JSON-LD and (if an author is set) `"@type":"Person"` are present in the rendered HTML.
   - Confirm the post would appear in `/sitemap.xml` and the `/blog` listing (automatic, no extra work).
6. **Commit and push**:
   - Stage **only** `src/lib/blog/posts.ts` (or the specific files actually touched, e.g. `schema.ts`/`page.tsx` for a structural change) — never `git add -A`. Concurrent sessions routinely leave unrelated uncommitted work in the same repo.
   - Confirm before pushing to `origin/main` (shared, live repo).
   - After pushing, if the reported commit range looks wrong (e.g. jumps further back than the last known commit), it's very likely a concurrent session's merge commit landed in between, not lost work — verify with `git merge-base --is-ancestor <last-known-commit> HEAD` before assuming anything went wrong.

## Known gaps / open items (not blog-specific, but adjacent)

- Backlink plan: Week 1 directory list fully worked as of 2026-08-11 (G2, SaaSHub, Capterra, GetApp, Software Advice, and Smol Launch live; AlternativeTo, Crunchbase, Indie Hackers, BetaList, and Launching Next submitted and pending approval; Product Hunt deliberately held for 2-3 real testimonials). Next phase (not yet started): pitch inclusion in existing "best Shopify pricing app" roundups, Reddit, and HARO-style platforms. See project SEO notes for full detail and GSC findings.
