# Brand Kit: Zorin

**Url:**
tryzorin.com (live production site, www.tryzorin.com is canonical)

**Name:**
Zorin

**About The Brand:**
Zorin is an ML-powered pricing intelligence platform for independent and small-to-midsize online store owners who don't have the time, or a data team, to figure out whether each product in their catalog is priced right. A merchant connects their Shopify or WooCommerce store, or uploads a CSV of sales history, and Zorin fits a price elasticity model per SKU, measuring exactly how demand shifts when price shifts, then delivers a plain raise, lower, or hold recommendation with an estimated profit lift and a confidence score based on how much real data supports it. Where most pricing tools either watch competitors or apply fixed discount rules, Zorin reads the merchant's own sales history first, the data that actually reflects how their specific customers respond to price. The core recommendation doesn't automatically scrape or live-monitor competitor sites, that mechanism was deliberately left out of the primary model in favor of reading real, first-party demand data. Zorin does offer a lightweight manual option for merchants who still want market context: log a competitor's name, price, and an optional URL per product, and Zorin computes the min, median, and max across what's been entered, feeding it into the Launch Planner without a separate tracking subscription. Its aspiration is to put the pricing intelligence once reserved for retailers with in-house analysts into the hands of any merchant running a lean operation.

**About Ideal Customer Profile:**
Demographics
Independent and SMB online retailers selling physical goods through Shopify or WooCommerce, typically with 10 to 150+ SKUs and at least 6 months of real sales history with some price variation in it (elasticity needs price movement to read, not just volume). The buyer is usually the store owner/founder themselves, or a small operations team of one to five people who handle pricing as one of many responsibilities, not a dedicated analyst. Primarily US, UK, EU, SG, and AU-based sellers.

Key characteristics, Goals and Challenges
They're trying to grow revenue without quietly bleeding margin, a balance that's hard to hold when pricing decisions are made ad hoc, by gut feel, or by copying whatever a competitor happens to charge. They know their own sales data holds the answer to what customers will actually pay, but have no realistic way to read it systematically across dozens or hundreds of SKUs without a data science background. Success, to them, looks like a specific, defensible number for each product, not a vague sense that prices are "probably fine."

Behavioral Traits and Pain Points
They discover pricing tools through the Shopify App Store, seller communities (Reddit's r/ecommerce, r/shopify, r/woocommerce, Facebook groups), or word of mouth from other merchants. They evaluate new tools cautiously, testing on a handful of SKUs before trusting a bulk rollout, because they've been burned by black-box repricers that raced competitors to the bottom with no regard for their own margin, or by fixed-rule discount plugins that never actually answer whether a price is optimal. Their sharpest frustration is with tools that give a bare instruction ("change this price to $24.99") with no stated reason they can sanity-check. The moment that triggers a purchase is usually realizing, after the fact, that a "just match the market" or "never touch it" pricing habit has quietly left real profit on the table.

Preferred Communication Style
Plain English over jargon. They trust a number that comes with a reason attached ("your elasticity is -1.2; raising to $85 lifts profit an estimated 14%") far more than a vague AI promise. They respond well to short, concrete how-to content, real screenshots, and real math, not abstract claims about "AI-powered optimization." They're skeptical of hype and reassured by specificity, and they want to know a recommendation's confidence level before they trust it, not after.

**Competitors:**
Zorin's actual differentiator is category, not feature parity, most tools below fall into a different mechanism entirely rather than a head-to-head alternative.
- **Competitor repricers** (watch and match/undercut competitor prices, not the merchant's own demand): Prisync, Price2Spy, PriceMole, Price Parrot, Pricefy, RepricerExpress / Repricer.com, WooCommerce Repricer, Dealavo, Price Patrol, Pricesearch
- **Rule-based discount/dynamic pricing plugins** (apply fixed rules the merchant configures, not calculated from demand): Discount Rules for WooCommerce (FlyCart), YITH WooCommerce Dynamic Pricing and Discounts, WooCommerce Dynamic Pricing (official), Advanced Dynamic Pricing (Acowebs/WPFactory)
- **Wholesale/B2B role-pricing plugins** (segment which price a customer sees, don't calculate what the price should be): WooCommerce Wholesale Prices, WholesaleX, B2B Pricing
- **Enterprise/elasticity-adjacent platforms** positioned above the SMB segment Zorin targets: Intelligems, Competera

## 1. Product & Feature Overview

### Catalog & Sales History Import
- **Catalog import:** Merchants connect Shopify or WooCommerce for live sync (products, orders, price write-back), or upload catalog and sales history via CSV, including an optional `image_url` column for CSV-only merchants.
- Real-time webhooks keep Shopify/WooCommerce-connected catalogs in sync automatically after the initial connection (`products/update`, `orders/create` and equivalents); manual "Sync now" remains available as the initial-backfill and recovery path.
- Designed so a merchant can get a full-catalog view without a data team or spreadsheet wrangling.

### Elasticity Recommendation Engine
- **ML-driven decision engine:** Fits a log-log regression per SKU from the merchant's own historical price-and-quantity data, producing a price elasticity coefficient and an R-squared fit score.
- Outputs one of three actions per product: raise, lower, or hold, with an estimated profit lift.
- A confidence label (commonly Strong / Fair / Weak, or a numeric model-health score) reflects how much real data and price variation actually support the estimate, a thin-data product is never presented with the same certainty as a well-established one.
- Automatically detects and flags likely promotional spikes in the sales history, excluding them from the model fit so a discount period doesn't distort the baseline elasticity read.
- The core recommendation doesn't automatically scrape or live-monitor competitor prices, it's grounded in the merchant's own customers' demonstrated behavior. A separate manual option lets a merchant log a competitor's name, price, and an optional URL per product for a min/median/max view, without a dedicated tracking subscription.

### Price Sensitivity Survey (Van Westendorp)
- **Stated-preference layer alongside the elasticity model:** a merchant generates a shareable, no-login survey link per product; a customer answers four classic price-perception questions (too cheap, good value, getting expensive, too expensive).
- Calculates an acceptable price range, an optimal price point, and an indifference price point once enough responses accumulate, with an honest confidence tier (none under 5 responses, low at 5-19, good at 20+).
- Deliberately kept as a separate advisory panel, not blended into the raise/lower/hold elasticity recommendation, stated preference (what customers say) and revealed preference (what customers actually did) are different signals worth reading side by side.
- No email, name, or IP address is stored with a response; the survey link itself requires no customer login or account.

### Review & Apply Workflow
- **Merchant-controlled pricing:** Merchants review each recommendation and can adjust it with a price slider or by typing an exact price, with a live preview of the resulting margin and profit lift before committing (the what-if simulator).
- Recommendations can be applied individually, product by product, or in bulk across the whole catalog, with per-product independence during a bulk apply (one product's failure doesn't block the rest).
- Nothing changes automatically, the merchant always makes the final call, and an applied change pushes to Shopify/WooCommerce before the local database commits, so a platform-side failure never silently diverges from what's actually live.

**Brand Point Of View:**
Core beliefs
Pricing decisions should be led by a merchant's own data, not fear of losing a sale to whoever has the lowest number, and not a rule copied from a discount plugin's default settings. A recommendation without a stated reason and a confidence level isn't useful, it's just another figure the merchant has to independently verify before trusting it. Small and mid-size retailers deserve the same pricing intelligence infrastructure that large retailers build in-house, without needing an analyst on staff to run it.

Mission and vision
Mission: Give independent and SMB online retailers a single, trustworthy answer to "what should I charge today", grounded in their own sales history, not a competitor's price or a guessed rule, so they stop guessing and stop copying blindly. Vision: A market where no small retailer prices itself into unprofitability out of fear of losing a sale, because rigorous, data-grounded pricing intelligence is available to any merchant, not just those who can afford a pricing team.

Values
- **Data First** — Every recommendation is grounded in the merchant's own sales history, not a competitor's price or a fixed rule.
- **Radical Clarity** — Every number ships with its reasoning and confidence level attached, in plain language a non-analyst can understand and defend to themselves or a partner.
- **Earned Trust** — Confidence in a recommendation scales with the data behind it; a thin-data estimate is labeled as such, never dressed up with false certainty.
- **Merchant Control** — Zorin recommends; the merchant decides. Bulk apply exists for speed, but nothing changes without an explicit human okay.
- **Respect for Time** — Built for people running a business with no spare hours for spreadsheets, not for pricing analysts with a dashboard to babysit all day.

Unique perspective
Most pricing and repricing tools quietly assume the goal is to win by matching or beating the cheapest competitor. Zorin's contrarian bet is that a competitor's price was never calculated from your customers' behavior in the first place, it reflects their costs, their brand, and their audience, not yours. The real competitive edge for a small or mid-size retailer is reading their own demonstrated demand and pricing to it, not reflexively chasing a number that has nothing to do with their own buyers.

Brand personality
Precise, trustworthy, clear. Not a hype machine, not startup-chirpy. Zorin talks like a sharp analyst who explains the number and tells you what to do with it, data leads, prose follows. It shows its work (the elasticity, the R-squared, the confidence label) instead of asking for blind trust, and it stays calm and specific even when the news is "you should raise this price" or "hold here, the data's still thin."

Positioning statement
Zorin is the ML-powered pricing platform for independent and SMB online retailers that reads your own sales history and tells you the right price and why, never a competitor's number, never a guess.

**Author Persona:**
Professional background
Writes like someone who has either run a small e-commerce operation themselves or spent years as an in-house pricing analyst for a mid-size retailer, comfortable with elasticity, statistical confidence, and the operational reality of a lean team, not just the theory of pricing strategy.

Personality traits
Direct and unshowy, gets to the number and the reason fast. Quietly confident, because the math is real regression run on real data, not hyped. Patient with non-experts, translating statistical output into plain language without condescension. Allergic to vague claims; always reaches for the specific figure and its confidence level.

Expertise areas
Price elasticity and demand modeling, margin and profit-lift math, e-commerce catalog operations, the practical mechanics of running pricing changes across a real Shopify or WooCommerce store (not just pricing theory).

Communication style
Short, declarative sentences. Leads with the concrete number, then the reasoning. Uses real, worked examples ("elasticity of -1.2, raising to $85 lifts profit an estimated 14%") instead of abstractions. Technical enough to be credible, plain enough that a solo founder never needs a glossary.

Perspective
Sees pricing as an operational discipline that's been needlessly gatekept behind analyst headcount and enterprise software, and believes the fix is giving merchants the same statistical rigor in a form built for a one-person pricing "team," reading their own data instead of a competitor's price.

Relationship with audience
A knowledgeable peer, not a guru or a vendor. Talks to the merchant like someone who's sat in their chair, not down to them from a pricing department.

**Tone Of Voice:**
Voice characteristics
- **Straight-Shooting Analyst** — Leads with the number and the math. No hedging, no marketing fluff around a recommendation; states the price action and the reasoning in the same breath.
- **Honest About Confidence** — Never presents a thin-data estimate with the same certainty as a well-supported one; the confidence label is always part of the story, not an afterthought.

Tone spectrum
Headline/CTA contexts: Confident and outcome-focused, "Stop guessing your prices. Start optimizing." Short, declarative, no exclamation points.
Feature descriptions: Specific and mechanical, describe exactly what the model calculates and what it flags, using real terms (elasticity, R-squared, confidence) rather than vague ones (smart, optimized).
FAQ/Support: Plain and reassuring, answering the unspoken worry directly ("Do I need a data science background to use this? No, the regression runs automatically; you get a plain raise, lower, or hold recommendation.").
In-product copy (recommendations): Terse and numeric first, plain-English reason second, always in that order.

Language preferences
Favors concrete verbs: calculate, fit, flag, apply, adjust. Prefers exact numbers and percentages over adjectives like "significant" or "substantial." Avoids "smart," "powerful," "revolutionary," and other AI-marketing filler. Uses second person ("you," "your catalog," "your sales history") to keep the merchant as the owner of every decision.

Emotional qualities
Readers should feel in control and reassured, like they finally have a systematic read on their own data instead of a black box or a guess, without feeling like they've handed over the keys.

Formality level
Casual-professional, closer to a knowledgeable Slack message from a co-founder than a corporate deck. Specific enough to be taken seriously by a finance-minded reader, loose enough to read in thirty seconds on a phone between tasks.

Unique voice elements
- Always pairs a price action with its exact elasticity and estimated profit-lift consequence in the same sentence.
- Refers to a recommendation's confidence explicitly, never presents a number without saying how much data supports it.
- Never says a price is simply "too high" or "too low," always frames it relative to the merchant's own elasticity and the resulting profit impact.

Practical guidance
Headlines: State the outcome plainly, no hype words. Example: "Stop guessing your prices. Start optimizing."
Body copy: Open each block with a bolded subheading, then explain mechanically, using a concrete example wherever possible.
CTAs: Action + object, no exclamation marks. Example: "Start free trial," "Connect your sales history."
FAQs: Phrase the question the way a worried merchant would actually ask it, then answer with the specific mechanism, not a reassurance-only non-answer.

Overall consistency
Every piece of Zorin content, from a headline to an FAQ answer, pairs a concrete number or mechanism with a plain-English reason, and never asks the reader to just trust the AI.

**Writing Rules:**
Grammar and Punctuation
1. No exclamation points in product copy or headlines. "Start your free trial." not "Start your free trial today!"
2. Use percentages and dollar figures as digits, never spelled out. "18.3% lift," not "eighteen percent lift."
3. Oxford comma throughout. "Raise, lower, or hold."
4. Contractions are welcome in body copy to keep tone conversational ("you're," "it's," "won't").
5. Avoid semicolons in customer-facing copy; prefer two short sentences.
6. **No em-dashes anywhere** (hard rule, applies to all blog and marketing copy), use a comma, a period, or restructure the sentence instead.

Formatting Preferences
1. Lead feature blocks with a bolded label followed by a colon, then the explanation.
2. Use short paragraphs (2-3 sentences max) in body copy, merchants read on mobile between tasks.
3. Use numbers/percentages inline rather than charts when a single figure makes the point.

Voice and Perspective
1. Always address the merchant as "you," never "the user" or "customers" in product copy.
2. Refer to the model's output as something the merchant reviews and decides on ("your recommendation," "your confidence score"), never as opaque AI behavior.
3. Never use "we think" or "we believe" for a price recommendation, state the math directly ("your elasticity is -1.2").

Sentence Structure
1. Lead with the concrete fact (the number, the action), follow with the reasoning. Not the reverse.
2. Keep sentences under ~20 words in product copy; split compound claims into two sentences.
3. Avoid nested clauses, one idea per sentence in anything a merchant reads while making a pricing decision.

Word Choice
1. Say "price elasticity" or "elasticity," never "competitor median" or "market price" for the core recommendation, Zorin's primary mechanism is demand-based, not competitor-based. If the manual competitor price log comes up, describe it accurately as an optional, manual, per-product entry, not automated tracking.
2. Say "recommendation," never "prediction", the confidence label communicates certainty, the word choice shouldn't imply pure guesswork either way.
3. Avoid "AI-powered," "smart," "optimize" as unsupported adjectives; if AI/ML is mentioned, say specifically what it does (fits an elasticity model from sales history, phrases the reasoning in plain language).
4. Say "your own sales history" or "your own customers," never "the market" or "the competition," to keep the actual data source visible.
5. Say "confidence" or "confidence score/label," never imply a recommendation is certain without qualifying how much data supports it.

Content Structure
1. Every recommendation shown to a merchant states: the action (raise/lower/hold), the elasticity/reasoning behind it, the estimated profit lift, and the confidence level, in that order.
2. Feature pages open with the mechanism, then the merchant benefit, then a worked example.
3. FAQ answers open with a direct yes/no or the specific number before any elaboration.
4. Homepage and landing copy always includes at least one real, worked pricing example, never an abstract claim alone.
5. CTAs always name the concrete next action (connect, upload, review, apply) rather than a vague verb (start, learn more).
6. Blog posts follow the established structure: an answer-first `<p class="intro">`, a Key Takeaways block, H2/H3 body sections grounded in the elasticity mechanism, at least one table, 2-3 contextual internal links, a soft CTA to `/signup`, a 6-10 item FAQ section, and a `<p class="conclusion">` closing paragraph. Real, verifiable citations via web research where possible; a vague placeholder only when nothing verifiable was found.

**Cta Text:**
Start free trial

**Cta Destination:**
/signup

**Writing Sample Url:**
/ (homepage)

**Writing Sample Title:**
Stop Guessing Your Prices. Start Optimizing.

**Writing Sample Body:**
**Stop guessing what to charge:** Every product in your catalog has a real answer hiding in your own sales history. Zorin reads it and tells you, product by product, whether to raise, lower, or hold, with the elasticity and the estimated profit lift behind the call.

**Your own data, not a competitor's price:** Zorin's core recommendation doesn't scrape or live-monitor competitor prices. It fits a price elasticity model from your own sales history, because your customers, your costs, and your brand aren't the same as anyone else's. If you still want market context, you can manually log a competitor's price per product for a min/median/max view.

**See the reasoning, not just the number:** Instead of a bare price, you get the math: "Your elasticity is -1.2. Raising to $85 lifts profit an estimated 14%." along with a confidence label so you know how much data actually supports it. You can defend every price change to yourself, a co-founder, or an investor, because the reasoning is right there.

**You apply it, on your terms:** Adjust any recommendation with a slider or type your own number, and preview the resulting margin before committing. Apply changes one product at a time or across your whole catalog in a single pass, the decision is always yours, Zorin just does the reading and the math.

**Writing Sample Outline:**
This homepage hero copy is written to reassure a time-strapped SMB merchant that Zorin solves the specific, dreaded problem of guessing at prices without a data team. It opens by naming the core pain (pricing by gut feel or copying competitors), then immediately establishes that the recommendation is grounded in the merchant's own sales history rather than a competitor's price, then demonstrates the plain-English reasoning with the brand's signature worked example (elasticity, profit lift, confidence), and closes by reinforcing merchant control over every price change. A writer using this as a brief should keep every claim tied to a concrete, worked number, always state or imply the confidence behind it, and never suggest the tool automatically watches, scrapes, or live-monitors competitor prices for its core recommendation (the manual per-product competitor log is a separate, optional feature and should only come up if directly relevant).

**Header Case Style:**
- **H1 (page titles):** Title Case, "Stop Guessing Your Prices. Start Optimizing."
- **H2 (section headers):** Title Case, "Elasticity Recommendation Engine."
- **H3 (feature sub-labels):** Sentence case, "Catalog import."
- **Navigation labels:** Sentence case, "Dashboard," "Guide."
- **Button/CTA labels:** Title Case, "Start Free Trial," "Connect Your Sales History."
- **FAQ headers:** Sentence case, phrased as the merchant would ask it, "Do I need a data science background to use this?"
