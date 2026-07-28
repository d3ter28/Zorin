export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  category: string;
  content: string; // HTML string
};

export const posts: BlogPost[] = [
  {
    slug: "should-you-price-differently-on-shopify-vs-amazon",
    title: "Should You Price Differently on Shopify vs Amazon?",
    excerpt:
      "Amazon and Shopify have different fee structures. Here's why matching your price exactly across both usually costs you margin.",
    date: "2026-07-27",
    readingTime: "8 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Yes, in most cases you should. The fee structures on Amazon and Shopify are different enough that matching your price exactly across both usually erodes your margin on whichever platform charges more. I've seen this catch sellers off guard more than once: they set one price, copy it everywhere, and only notice the margin problem when Amazon's cut takes a much bigger bite than expected. This isn't a minor rounding issue either. On a $30 product, a few extra percentage points in fees can be the entire difference between a healthy margin and barely breaking even. Zorin exists partly to catch that gap before it becomes a pattern you only discover at month-end.</p>

<h2>The Fee Gap Is the Real Reason Prices Differ</h2>
<p>Amazon's referral fee typically runs around 15%, and that's before factoring in FBA fulfillment and storage costs if you use it. Shopify's transaction fee, by comparison, sits closer to 2.9% (add source for current exact figures). That's not a small difference. If you charge the same retail price on both, your effective margin on Amazon is meaningfully thinner, sometimes thin enough to erase most of the profit you thought you had.</p>
<p><strong>Here's a simplified way to see it side by side:</strong></p>
<table>
  <thead>
    <tr><th></th><th>Shopify</th><th>Amazon (FBA)</th></tr>
  </thead>
  <tbody>
    <tr><td>Transaction/referral fee</td><td>~2.9%</td><td>~15% referral (add source for current rate)</td></tr>
    <tr><td>Fulfillment cost</td><td>Your own shipping setup</td><td>FBA pick, pack, storage fees</td></tr>
    <tr><td>Who controls the price page</td><td>You, fully</td><td>You, but constrained by marketplace price comparisons</td></tr>
    <tr><td>Typical margin impact vs list price</td><td>Lower fee drag</td><td>Higher fee drag</td></tr>
  </tbody>
</table>
<p>This table is illustrative, not an exact quote of either platform's current fee schedule, since fee structures change and vary by category and fulfillment method.</p>
<p><strong>This is the actual reason "different pricing" makes sense</strong>, not a branding inconsistency you should feel bad about. It's a direct response to a cost structure that isn't the same across platforms. I'd go further and say treating it as a branding problem is the mistake. A brand can be perfectly consistent in tone, packaging, and customer experience while still pricing a product differently on two platforms with two different economics underneath.</p>

<h2>Set a Margin Floor Per Channel, Not Just Per Product</h2>
<p>Most sellers who set a margin floor set it per product. Fewer set it per channel, and that's the gap that causes trouble. The same product carries a different true cost depending on where it sells, so a single floor applied everywhere either overprotects your Shopify margin or underprotects your Amazon margin.</p>
<p><strong>In practice, this means:</strong> your Amazon floor should already account for the referral fee and fulfillment cost before you ever compare to a competitor price. Your Shopify floor doesn't carry that same fee burden, so it can sit lower and still be just as profitable. Setting the floor per channel, once, removes the guesswork every time you touch a price after that.</p>
<p>I'd add one more layer here: your Amazon floor should probably be revisited more often than your Shopify floor, simply because Amazon's fee categories and FBA costs shift more frequently than a standard payment processor's transaction rate does. A floor set a year ago on Amazon might already be stale in a way your Shopify floor isn't.</p>
<p><strong>A few practical questions worth asking per channel:</strong></p>
<ul>
  <li>What's my true landed cost on this channel, including all fees, not just the referral percentage?</li>
  <li>Does this channel's fulfillment method (self-ship vs FBA vs 3PL) change the cost enough to matter?</li>
  <li>How often does this channel's fee structure actually change, and have I checked recently?</li>
</ul>

<h2>Consistency vs Differentiation Isn't All-or-Nothing</h2>
<p>Channel-based price segmentation lets you differentiate for margin while staying deliberate about it. Done well, this kind of segmentation can improve gross margin by a meaningful percentage without touching your cost of goods at all. The key word is deliberate. A price gap that exists because you calculated the fee difference is a different thing entirely from a price gap that exists because nobody checked in six months.</p>
<p><strong>I'd frame it this way:</strong> differentiation is fine, drift isn't. One is a decision, the other is neglect.</p>
<p>There's a middle failure mode worth naming too: differentiation that starts deliberate and slowly becomes drift. You set the Amazon price correctly six months ago, factoring in fees at the time. Since then, a competitor moved, your costs changed, and nobody revisited the gap. It's technically still "differentiated," but it's no longer based on anything current. This is exactly the kind of slow decay that's hard to notice product by product but adds up across a full catalog.</p>

<h2>What Happens When Channels Drift Out of Sync</h2>
<p>Unmanaged drift, as opposed to deliberate segmentation, is where the real damage happens. A price that quietly falls out of step with a channel's actual costs doesn't usually announce itself. It shows up as a margin number that's lower than expected at the end of a reporting period, with no single obvious cause. By the time it's noticed, it's often been happening for weeks or months across more than one product.</p>
<p>The fix isn't complicated, but it does require a system rather than memory: check each channel's price against that channel's own margin floor and competitor set on a regular basis, not just when you first list a product.</p>

<h2>Do Customers Actually Notice?</h2>
<p>They do, more than sellers sometimes assume. Survey data suggests a majority of shoppers report losing trust when prices vary between channels for the same product (add source for the full report). That doesn't mean channel pricing is off the table. It means the gap needs a reason you could explain out loud if a customer asked, not a shrug.</p>
<p><strong>The practical takeaway:</strong> if someone screenshots your Amazon price next to your Shopify price, you should be able to explain the difference in one sentence, tied to fees or channel-specific costs, not silence.</p>
<p>I think this is where a lot of sellers get nervous and overcorrect toward forcing identical prices everywhere, which just moves the problem instead of solving it. The goal isn't zero price variation. It's zero unexplained price variation.</p>

<h2>How Zorin Handles Per-Channel Pricing</h2>
<p>Zorin lets you set a margin floor per channel, not just per product, so the same item can carry a different floor on Amazon than it does on Shopify, reflecting the real fee gap instead of an arbitrary markup. Every channel's recommendation gets checked against that channel's own competitor median, and Zorin's reasoning states the fee-adjusted math directly: something like "this price still clears your Amazon floor after referral fees, even though it's below your Shopify price for the same product." Nothing changes automatically across channels. Each one gets reviewed and applied on its own terms, which matters most for sellers running a lean one-to-five-person operation with no separate team watching each platform.</p>
<p>I've found this is the part that actually saves time day to day: not having to redo the fee math by hand every time a competitor shifts on one platform but not the other. When a competitor drops their Amazon price, Zorin checks that shift against your Amazon-specific floor and median, not your Shopify numbers, and tells you plainly whether reacting still leaves you profitable on that channel specifically.</p>

<h2>Managing Margin Floors Per Channel in Practice</h2>
<p>If you're setting this up for the first time, I'd suggest starting with your highest-fee channel, usually Amazon if you sell there, since that's where an unadjusted floor causes the most damage the fastest. Calculate the true landed cost including fees, set the floor from there, and only then compare against the competitor median on that channel. Repeat for each channel you sell on, and revisit each one on its own schedule rather than all at once, since fee changes rarely happen on the same calendar across platforms.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>Should I price the same product differently on Shopify vs Amazon?</h3>
<p>Usually yes. Amazon's fees are structurally higher than Shopify's, so matching prices exactly typically thins your margin on Amazon specifically.</p>
</div>
<div class="faq-item">
<h3>How do I keep pricing consistent across multiple storefronts?</h3>
<p>Consistency doesn't mean identical prices. It means a defensible, fee-based reason for any gap, applied the same way every time rather than left to drift.</p>
</div>
<div class="faq-item">
<h3>What happens if my prices don't match across channels?</h3>
<p>If the gap is deliberate and fee-driven, little happens beyond an occasional customer question you can answer plainly. If it's accidental drift, it usually shows up later as unexplained margin loss.</p>
</div>
<div class="faq-item">
<h3>Do customers notice or care about cross-channel price differences?</h3>
<p>Yes. Survey data shows a majority of shoppers lose some trust when prices vary between channels, so any gap should have a clear, statable reason.</p>
</div>
<div class="faq-item">
<h3>How do I manage margin floors separately per channel?</h3>
<p>Set a distinct floor for each channel that accounts for that channel's real fees and costs, then let every price recommendation for that channel get checked against its own floor.</p>
</div>
<div class="faq-item">
<h3>Why are Amazon fees higher than Shopify fees?</h3>
<p>Amazon's referral fee (around 15%) plus optional FBA fulfillment and storage costs stack on top of the sale, while Shopify's transaction fee is closer to 2.9% (add source for current exact rates).</p>
</div>
<div class="faq-item">
<h3>Does price segmentation hurt customer trust?</h3>
<p>Not inherently. Trust erosion tends to come from unexplained or inconsistent gaps, not from a clearly reasoned, fee-based price difference.</p>
</div>
<div class="faq-item">
<h3>How do I calculate a fee-adjusted price for a marketplace?</h3>
<p>Start with your margin floor, add back the marketplace's referral and fulfillment fees as a cost, then check the resulting price against that channel's competitor median before finalizing it.</p>
</div>
<div class="faq-item">
<h3>How often should I revisit my per-channel pricing?</h3>
<p>Often enough to catch fee changes and competitor shifts, but not so often you're reacting to noise. Marketplace fee categories in particular are worth rechecking whenever a platform announces a fee update, not just on a fixed schedule.</p>
</div>
<div class="faq-item">
<h3>Is it normal for Amazon prices to be higher than a brand's own site?</h3>
<p>Yes, this is common precisely because of the fee gap. A higher Amazon price with the same margin floor is a sign the system is working as intended, not a red flag.</p>
</div>
</section>

<p class="conclusion">Pricing differently across channels isn't a compromise on consistency, it's a response to a cost structure that genuinely differs from one platform to the next. Set the floor per channel once, revisit it on its own schedule, and the rest of the pricing decisions get a lot easier to defend, to yourself and to any customer who happens to compare the two.</p>
    `.trim(),
  },
  {
    slug: "shopify-pricing-apps-what-to-look-for",
    title: "Shopify Pricing Apps: What to Look for Before You Buy",
    excerpt:
      "Most pricing tools skip a margin floor, plain-English reasoning, or a review step. That gap is where merchants get burned.",
    date: "2026-07-27",
    readingTime: "9 min read",
    category: "Product",
    content: `
<p class="intro">If you're evaluating a Shopify pricing app, the short answer is this: look for a margin floor you control, plain-English reasoning behind every recommendation, and a review step before any price actually changes. Most pricing tools skip at least one of those three things, and that gap is usually where merchants get burned. I've spent enough time in pricing spreadsheets and app comparisons to know that "AI-powered" on a landing page tells you almost nothing about how the tool actually behaves with your catalog.</p>

<p>This guide walks through what to check before you commit, how the category breaks down, what it typically costs, and how to test a tool safely before you touch your whole store. I'll also point out where a tool like Zorin, a pricing copilot built specifically for this problem, changes the calculation.</p>

<h2>What a Shopify Pricing App Actually Does</h2>
<p>"Pricing app" is a vague label that covers three genuinely different tools, and conflating them is the fastest way to pick the wrong one. Some tools only watch competitor prices and alert you. Others watch and then change your price automatically based on rules you set. A smaller third group watches, recommends a specific action, and explains the math, but leaves the final call to you.</p>
<p>I think of it as a spectrum of how much decision-making the tool takes off your plate, and how much control it takes with it:</p>
<ul>
  <li><strong>Price monitors:</strong> track competitor prices and notify you of changes. You still decide and manually update.</li>
  <li><strong>Repricers:</strong> automatically adjust your price when a competitor moves, based on rules you configure in advance.</li>
  <li><strong>Pricing copilots:</strong> analyze the market, recommend a raise, lower, or hold action with a stated reason, and wait for your approval before anything changes.</li>
</ul>
<p>Zorin sits in that third category. It compares each product's price against the competitor median, checks the result against a margin floor you set, and gives you one of three plain recommendations per product. Nothing applies automatically. You review, then apply, one product at a time or in bulk.</p>
<p>Knowing which category you're actually shopping in before you compare app names saves you from comparing a $39/month price alert tool against a $200/month automated repricer and wondering why the feature lists look so different.</p>

<h2>Five Things to Evaluate in a Shopify Pricing App</h2>
<p>Star ratings tell you whether other merchants had a good support experience, not whether the tool will protect your margin. I'd rather score a candidate tool against five specific criteria before installing anything.</p>

<h3>Margin protection, not just competitor matching</h3>
<p>Most pricing tools will happily show you that a competitor is cheaper. Far fewer will refuse to recommend a price that would put you at a loss. Ask directly: does this tool enforce a margin floor, or does it just show you the gap and leave the floor math to you? With Zorin, the floor is a hard constraint you set once. If a lower price would drop you below it, Zorin holds instead of suggesting it, no exceptions.</p>

<h3>Setup effort: CSV import vs. live sync</h3>
<p>Some tools need a Shopify connection and nothing else. Others need you to export your catalog and competitor prices into a spreadsheet first. Neither is wrong, but you should know which one you're signing up for before you buy, especially if your catalog changes weekly. Zorin's current import is CSV-based, with direct Shopify sync and live competitor scraping on its roadmap. That's worth knowing upfront rather than discovering during onboarding.</p>

<h3>Reasoning you can actually defend</h3>
<p>A bare number ("lower to $24.99") isn't a recommendation, it's homework. You still have to check the competitor price yourself, check your margin yourself, and decide if it's actually a good idea. A tool that shows its work, something like "you're 18% above the market median, lowering still leaves a 42% margin," lets you make the call in seconds and explain it to a co-founder or partner without re-deriving the math.</p>

<h3>Catalog and competitor coverage</h3>
<p>Free tiers commonly cap out fast. In this category, free plans are frequently capped around 5 to 50 SKUs and a small handful of tracked competitors, which is fine for testing but rarely enough for a full catalog. Know the cap before you build a workflow around a free plan you'll outgrow in a month.</p>

<h3>Review-and-apply controls</h3>
<p>Can you approve one product before touching your whole catalog? Can you override a recommendation with your own number? If a tool only offers "turn on auto-pricing for everything," that's a much bigger leap of faith than most merchants are comfortable taking on day one.</p>
<p>A pricing app is worth evaluating on these five points specifically: margin enforcement, setup effort, reasoning transparency, coverage limits, and how much control you keep over the apply step.</p>

<h2>Repricer vs. Pricing Copilot: The Real Difference</h2>
<p>A repricer changes your price for you, automatically, based on rules you configured earlier. A pricing copilot recommends what to do and explains why, then waits for you to say yes. That's the entire distinction, and it matters more than the marketing copy on either category usually suggests.</p>
<p>Here's a worked comparison using the same scenario: your product is priced at $30, and a competitor drops theirs to $26.</p>
<table>
  <thead>
    <tr><th></th><th>Repricer</th><th>Pricing Copilot (Zorin)</th></tr>
  </thead>
  <tbody>
    <tr><td>Response to competitor at $26</td><td>Auto-drops to $26 or slightly under, immediately</td><td>Checks $26 against your margin floor first</td></tr>
    <tr><td>If $26 is below your floor</td><td>Often applies anyway unless you built floor logic into the rule yourself</td><td>Holds at $30, or recommends the lowest price that still clears your floor</td></tr>
    <tr><td>Who decides</td><td>The rule, automatically</td><td>You, after seeing the number and the reason</td></tr>
  </tbody>
</table>
<p>The practical risk with pure repricers is well documented in the space: automated repricing amplifies both good and bad decisions, and a misconfigured rule can push a price below the margin threshold within hours, sometimes triggering a race-to-the-bottom price war with a competitor doing the same thing (add source for current industry data). A copilot structurally can't do that, because the margin check happens before anything is ever suggested, not after the fact.</p>
<p>If you want speed and don't mind rules doing the deciding, a repricer fits. If you want a specific recommendation with math attached and the final decision kept in your hands, that's the copilot category, and it's the gap Zorin is built to close.</p>

<h2>Is a Pricing App Worth It for a Small Store</h2>
<p>Whether a pricing app earns its cost depends much more on your catalog size and category than on your revenue number. A store with 200 comparable SKUs in a price-visible category has a very different math problem than a store with 8 custom, hard-to-compare products.</p>
<p>A few honest scenarios:</p>
<ul>
  <li><strong>You sell 20+ products in a category where customers shop on price</strong> (electronics accessories, beauty, supplements, outdoor gear): worth it. Manually checking dozens of competitor prices weekly isn't a sustainable habit, and losing sales to a visible $2 gap is the kind of thing that's easy to miss until it's already cost you.</li>
  <li><strong>You sell fewer than 10 products, or products that are hard to comparison-shop</strong> (custom, handmade, or highly differentiated items): probably not urgent yet. There's less competitive pricing pressure to track, and the tool's value shows up mainly once comparison shopping becomes a real factor in your sales.</li>
  <li><strong>You've been burned by manually "just matching the market"</strong> and noticed your margin eroding without a clear trigger: worth it immediately, because that's precisely the blind spot a margin-floor tool is designed to catch.</li>
</ul>
<p>I'd also flag a pattern worth watching for in yourself: merchants who reflexively match the lowest price in their category are often the ones who can least afford to keep doing it. A margin floor doesn't just protect you from a tool's mistake, it protects you from your own instinct to chase the market down.</p>

<h2>What Repricing and Pricing Tools Typically Cost</h2>
<p>Pricing for this category clusters into three rough tiers, and most comparison posts only quote the platform fee, so it's worth checking whether a transaction fee or SKU cap changes the real number for your catalog.</p>
<ul>
  <li><strong>Free tier:</strong> commonly capped at somewhere between 5 and 50 tracked SKUs and a handful of competitors. Fine for testing, rarely enough for a full catalog.</li>
  <li><strong>Entry paid tier:</strong> roughly $39 to $99 per month for small to mid catalogs, usually with an increased SKU and competitor cap.</li>
  <li><strong>Higher tiers:</strong> scale up from there based on catalog size, competitor count, or update frequency, sometimes running to $200+/month for larger operations or multi-channel tracking (add source for current category benchmarks).</li>
</ul>
<p>Two things I'd check before comparing prices across apps: whether the quoted number includes a per-transaction fee on top of the flat monthly rate, and whether the SKU cap actually covers your live catalog, not just your best sellers. A $49/month plan that caps at 50 SKUs isn't cheaper than a $79/month plan with no cap if you're running 150 products.</p>

<h2>Testing Before You Roll Out to Your Whole Catalog</h2>
<p>The safest way to evaluate any pricing tool is to run it on a small, price-visible subset of your catalog before you touch everything else. This isn't overcaution, it's the standard, sensible path merchants who've been burned by a black-box repricer or an enterprise platform built for someone with a dedicated analyst tend to take the second time around.</p>
<ol>
  <li><strong>Pick 10 to 20 products</strong> in your most price-competitive category, ones where you already know competitor prices move often.</li>
  <li><strong>Set your margin floor</strong> for that subset before importing anything, so you're testing the tool's judgment against a real constraint, not just watching it in a vacuum.</li>
  <li><strong>Review every recommendation individually</strong> for the first week or two. Check whether the reasoning holds up against prices you can verify yourself.</li>
  <li><strong>Apply changes product by product</strong> at first, not in bulk, until you trust the pattern of recommendations you're seeing.</li>
  <li><strong>Expand to the rest of your catalog</strong> once you've confirmed the tool respects your floor and the reasoning consistently makes sense.</li>
</ol>
<p>Zorin is built around exactly this kind of cautious rollout. You can import a subset, review each raise, lower, or hold recommendation with its margin math attached, adjust anything with a slider or your own number, and apply changes one product at a time before ever touching a bulk apply. Nothing changes without your explicit approval at any point in that process.</p>
<p>The trust-building step matters more than the feature list, especially with any AI-assisted tool. The value only holds up because you can review the output before it goes live, the same way you'd review a draft before publishing it. Tools that skip the review step ask for a kind of blind trust merchants have little reason to give an AI system on day one.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>What should I look for in a Shopify pricing app?</h3>
<p>Look for a margin floor you control, plain-English reasoning behind each recommendation, and a manual review step before any price change goes live. Tools that skip any of these three shift real risk back onto you.</p>
</div>
<div class="faq-item">
<h3>Are Shopify pricing apps worth it for a small store?</h3>
<p>Usually yes if you sell 10 or more comparable products in a category where customers actively price-shop. Less urgent for small catalogs of highly differentiated or custom products.</p>
</div>
<div class="faq-item">
<h3>How much does a pricing or repricing tool typically cost for an SMB seller?</h3>
<p>Free tiers commonly cap at 5 to 50 SKUs. Paid entry tiers typically run $39 to $99 per month for small to mid catalogs, scaling up from there based on SKU count and update frequency.</p>
</div>
<div class="faq-item">
<h3>What's the difference between a repricer and a pricing copilot?</h3>
<p>A repricer automatically changes your price based on rules you set in advance. A pricing copilot, like Zorin, recommends a specific action and margin reasoning and waits for your approval before anything changes.</p>
</div>
<div class="faq-item">
<h3>Can I test a pricing tool on a few products before rolling it out to my whole catalog?</h3>
<p>Yes. Most tools, including Zorin, support importing a small subset, reviewing recommendations individually, and applying changes product by product before a full bulk rollout.</p>
</div>
<div class="faq-item">
<h3>Will a pricing app ever suggest a price that hurts my margin?</h3>
<p>Not if it enforces a margin floor you set yourself. That constraint should be non-negotiable regardless of how aggressively a competitor is pricing.</p>
</div>
<div class="faq-item">
<h3>How is a pricing copilot different from just watching competitor prices myself?</h3>
<p>A copilot adds the margin math and a stated recommendation on top of raw competitor data, so you're not manually calculating the safe price for every SKU yourself.</p>
</div>
<div class="faq-item">
<h3>Do these tools require a pricing analyst to configure?</h3>
<p>No. Closing that exact gap, giving lean teams pricing intelligence without a dedicated analyst, is the specific problem copilot-style tools like Zorin are built to solve.</p>
</div>
</section>

<p class="conclusion">Getting a Shopify pricing app right isn't about picking the one with the most reviews. It's about matching the tool's mechanism, monitor, repricer, or copilot, to how much control you actually want to keep, then testing it on a handful of products before you trust it with everything. Start small, check the margin math, and expand once the recommendations hold up against prices you can verify yourself.</p>
    `.trim(),
  },
  {
    slug: "how-to-run-a-sale-without-wrecking-your-margin",
    title: "How to Run a Sale Without Wrecking Your Margin",
    excerpt:
      "Sales don't have to mean gambling with margin. Here's how to discount deliberately, not accidentally.",
    date: "2026-07-27",
    readingTime: "9 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">The safest way to run a sale without wrecking your margin is to keep your margin floor active during the promotion instead of suspending it. Every discount still gets checked against the minimum profit you're willing to accept, the same way it would on any ordinary day. I've watched sellers treat "sale season" as a different set of rules, and that's usually where the damage happens. Zorin builds around this exact idea: the floor doesn't take a break just because the calendar says it's Black Friday.</p>

<h2>Your Margin Floor Doesn't Pause for a Sale</h2>
<p>The single rule that prevents most sale-related margin loss is simple: the floor you set stays non-negotiable, promotion or not. A margin floor is the lowest profit percentage you're willing to accept on a product, and treating it as a suggestion rather than a hard limit is how a "successful" sale quietly turns into a loss once you look at the actual numbers. In practice, this means every discount gets the same check a regular price change would get: does this still clear the floor, or doesn't it. If it doesn't, the discount doesn't happen, no matter how good the sale looks on the surface.</p>
<p>I've seen this play out with sellers who ran a storewide 30% off event without checking margin per SKU first. Some products could absorb it comfortably. Others went straight through the floor and sold at a loss, and nobody noticed until the month-end numbers came in low. A margin floor applied consistently would have flagged those products before the sale even launched.</p>

<h2>Three Common Sale Scenarios, Three Different Risks</h2>
<p>Not every sale carries the same margin risk. A flash sale, a seasonal clearance, and a loyalty-only discount each behave differently, and treating them with one blanket rule usually means overprotecting one and underprotecting another.</p>
<table>
  <thead>
    <tr><th>Scenario</th><th>Typical Goal</th><th>Margin Risk</th><th>Reset Complexity</th></tr>
  </thead>
  <tbody>
    <tr><td>Flash sale (short window, high urgency)</td><td>Quick volume spike</td><td>Moderate; short duration limits total exposure</td><td>Low; reverts quickly once the window closes</td></tr>
    <tr><td>Seasonal clearance</td><td>Move slow inventory before it stales</td><td>Can be intentionally deeper on specific SKUs</td><td>Moderate; some products may not return to prior price at all</td></tr>
    <tr><td>Loyalty-only discount</td><td>Reward returning customers without public discounting</td><td>Low; narrow audience limits exposure</td><td>Low; public list price never moved</td></tr>
  </tbody>
</table>
<p>This framework is directional and meant to guide planning, not a guarantee for any specific catalog; actual risk depends on your own margin structure per SKU.</p>

<h3>The flash sale (short window, high urgency)</h3>
<p>Short, capped windows create urgency without setting a predictable discount calendar customers wait for. Because the exposure window is short, the total margin given up tends to be lower than a longer-running promotion, even if the discount percentage looks steep in the moment.</p>

<h3>The seasonal clearance (moving inventory before it stales)</h3>
<p>Clearance pricing accepts a lower margin on specific slow-moving SKUs deliberately, not catalog-wide. The goal here isn't preserving margin on every product; it's avoiding the larger cost of unsold inventory sitting past season.</p>

<h3>The loyalty-only discount (narrow audience, protected list price)</h3>
<p>Discounting through an account role or returning-customer channel protects the public list price while still rewarding loyal buyers. Because it's not broadcast to every visitor, it carries less margin exposure and less risk of resetting customer expectations about your normal price.</p>

<h2>Not Every Product Should Be Discounted the Same Way</h2>
<p>Segmenting your catalog before a sale matters more than picking one blanket discount percentage. Retail pricing research generally groups products into categories like bestsellers, margin protectors, and slow movers, and each group has a different amount of room to give.</p>
<ul>
  <li><strong>Bestsellers usually don't need a discount.</strong> Products already selling well rarely need incentive pricing. Discounting them mainly gives away margin you didn't need to give up to move the units.</li>
  <li><strong>Slow movers can absorb a steeper cut.</strong> Inventory that isn't moving has more room for a deeper discount, because unsold stock often costs more in the long run than the margin given up to clear it.</li>
</ul>
<p>I tend to think of this as triage, not a blanket policy. A 15% storewide discount treats a hot seller and a stale SKU identically, which almost never makes sense once you actually look at the two side by side.</p>

<h2>Compare to the Competitor Median, Not Whoever's Cheapest This Week</h2>
<p>During a sale season, competitors discount unevenly, some aggressively, some barely at all. Anchoring your own price to the single cheapest competitor you can find means you're calibrating against whatever their most extreme promotion happens to be, not the real market. The competitor median, the middle of that spread, gives a steadier read of where pricing actually sits during the sale window.</p>
<p>This is where the mechanism Zorin uses becomes relevant. It compares your price against the competitor median, not a single rival's promo price, and checks the resulting gap against your margin floor. You get one of three calls per product: raise, lower, or hold, along with the exact math, something like "matching this promotion still leaves you a 38% margin." The reasoning is there so you can act on it without re-deriving the numbers yourself every time a competitor changes their price mid-sale.</p>

<h2>Where Zorin Fits Across All Three Scenarios</h2>
<p>Whether a merchant is running a 48-hour flash sale, clearing end-of-season inventory, or offering a loyalty-only discount, Zorin checks every recommendation against the same margin floor and the same competitor median, and returns a plain-English reason either way, such as "this discount still leaves a 30% margin" or "this would cross your floor, hold instead." The scenario changes; the underlying discipline doesn't, and nothing is applied automatically, since every call still goes through the merchant's review-and-apply step.</p>
<p>This matters most for a lean team running a sale across a large chunk of the catalog at once. Reviewing every product by hand under a deadline is exactly when mistakes happen; having the floor and median check already run for you narrows the review down to the products that actually need a decision.</p>

<h2>Pricing Back Up When the Sale Ends</h2>
<p>Ending a sale is its own pricing decision, not something that reverts on its own. I've seen sellers manually guess their way back to "whatever it used to be," which either leaves money on the table or reintroduces the same margin risk they just spent the sale avoiding. The better approach is running the same floor-and-median check used to start the sale, in reverse, rather than trusting memory. If the competitor median has shifted while your sale was running, which it often has, your post-sale price should reflect that, not just bounce back to an old number.</p>
<p>Zorin's role here is the same reasoning applied in the other direction: comparing your reset price against the current median and your floor, rather than assuming last month's price is still the right one.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How do I run a sale without wrecking my margin?</h3>
<p>Keep your margin floor active during the promotion and check every discount against it before applying it, the same way you would on a normal day.</p>
</div>
<div class="faq-item">
<h3>Should I match competitor discounts during a sale season?</h3>
<p>Not automatically. Anchor to the competitor median across your category instead of matching whoever is running the deepest promotion, since that single price may be an outlier.</p>
</div>
<div class="faq-item">
<h3>How do I decide which products to discount and by how much?</h3>
<p>Segment your catalog first. Bestsellers usually don't need a discount at all, while slow moving inventory can typically absorb a steeper one.</p>
</div>
<div class="faq-item">
<h3>Does a margin floor still apply during promotions?</h3>
<p>Yes. The floor is a hard limit, not something that gets suspended for a sale. Any discount that would cross it shouldn't go live.</p>
</div>
<div class="faq-item">
<h3>How do I price back up after a seasonal sale ends?</h3>
<p>Check your reset price against the current competitor median and your margin floor, rather than reverting to whatever the price was before the sale started.</p>
</div>
<div class="faq-item">
<h3>Should I exclude bestsellers from a sale?</h3>
<p>Generally yes. They're already converting, so discounting them mostly gives away margin without meaningfully increasing sales.</p>
</div>
<div class="faq-item">
<h3>What's the difference between a seasonal discount and a permanent price cut?</h3>
<p>A seasonal discount is temporary and tied to a specific window, with a planned reset afterward. A permanent price cut has no reset and should be treated as a full repricing decision, not a promotion.</p>
</div>
<div class="faq-item">
<h3>How do I know when a sale has run too long?</h3>
<p>If a discount that started as a limited-time event starts looking like your everyday price, customers will treat it as the new normal, and reverting will feel like a price increase rather than a return to baseline.</p>
</div>
</section>

<p class="conclusion">Running a sale doesn't have to mean gambling with your margin. Set the floor once, segment your catalog honestly, match the median instead of the loudest discount you can find, and let the same discipline you'd use on any ordinary pricing day carry through the entire promotion, discount and reset both.</p>
    `.trim(),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getRecentPosts(n = 3): BlogPost[] {
  return [...posts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, n);
}
