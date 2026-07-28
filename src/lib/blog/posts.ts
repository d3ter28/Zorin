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
    slug: "how-do-i-know-what-to-price-my-products",
    title: "How Do I Know What to Price My Products?",
    excerpt:
      "Most merchants pick a price by gut feel or by copying a competitor. Here's the actual data-backed way to know.",
    date: "2026-07-28",
    readingTime: "8 min read",
    category: "Education",
    content: `
<p class="intro">You know what to price your products by reading your own sales history: how many units sold at each price you've charged in the past tells you exactly how sensitive your customers are to price, a number called elasticity. From that single number, you can calculate the price that maximizes profit for that specific product, not a guess borrowed from a competitor or a gut feeling about what "feels right."</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Your own sales history at different price points already tells you how price-sensitive your customers are, a number called elasticity.</li>
<li>Copying a competitor's price or pricing by gut feel doesn't answer this question, since their customers and cost structure differ from yours.</li>
<li>A confidence score (based on your model's fit and data volume) tells you how much to trust a given recommendation.</li>
<li>Promotional periods can distort the signal unless they're flagged and excluded from the model.</li>
<li>A what-if simulator lets you preview a price change's projected impact before you commit to it.</li>
</ul>
</div>

<h2>Why Gut Feel and Competitor Prices Don't Actually Answer the Question</h2>
<p>Most merchants price a product once, at launch, using some mix of cost-plus math and a glance at what similar products sell for elsewhere. That's a reasonable starting point. The problem is that nothing about it tells you whether $79 or $89 makes you more money. You genuinely can't tell without data, and gathering that data by hand takes time most merchants don't have.</p>
<p>Copying a competitor's price has the same blind spot in a different direction. Their customers found them through a different channel, in a different market, with a different brand relationship to that price point. Matching their number assumes your buyers behave identically to theirs. They usually don't, and the gap shows up as margin left on the table, not as an obvious red flag you'd notice.</p>

<h2>The Actual Answer: Your Own Sales Data Already Has It</h2>
<p>Every sale you've ever made at every price point is a data point about how your specific customers respond to price. If 100 customers bought a product at $49 but only 55 bought after you raised it to $59, that gap is a direct, measurable read on how price-sensitive your buyers are for that product. This relationship has a name: price elasticity of demand.</p>
<p><strong>In plain terms:</strong> an elasticity of -0.4 means demand barely moves when price moves, customers are relatively insensitive, so raising price usually raises total profit. An elasticity of -1.8 means demand is very sensitive, and pushing price up costs you more in lost sales than it gains you in margin per unit. The number tells you which direction actually helps.</p>

<h2>How Zorin Turns That Into a Number You Can Act On</h2>
<p>This is the exact mechanism Zorin's model runs. You upload your sales history (a CSV export, or a live Shopify/WooCommerce sync), and it fits a log-log regression across your price and quantity history for each product. The output is an elasticity coefficient, an R-squared score that tells you how much to trust the fit, and a plain recommendation: raise, lower, or hold, with an estimated profit lift attached.</p>
<table>
  <thead>
    <tr><th>What you see</th><th>What it means</th></tr>
  </thead>
  <tbody>
    <tr><td>Elasticity: -1.47</td><td>Demand is elastic; customers are fairly price-sensitive for this product</td></tr>
    <tr><td>R-squared: 0.91</td><td>Strong fit; the model explains 91% of the variation in your sales data</td></tr>
    <tr><td>Model confidence: High</td><td>Enough data points to trust the recommendation with reasonable confidence</td></tr>
    <tr><td>Recommendation: Raise, +18.3% lift</td><td>The estimated profit gain from moving to the recommended price</td></tr>
  </tbody>
</table>
<p>No spreadsheet, no data science background, and no competitor scraping required. The model reads your data, not anyone else's.</p>

<h2>What "Enough Data" Actually Means</h2>
<p>Elasticity estimates get more reliable with more price variation and more data points to learn from. A product that's had one price its entire life gives the model almost nothing to work with; a product that's moved through several price points across enough sales history gives it a real signal. This is why Zorin shows a confidence score and a model health badge (Strong, Fair, Weak) alongside every recommendation, rather than presenting every output with equal certainty. A weak-data product still gets a number, but you should treat it as a starting hypothesis, not a settled answer, until more sales history accumulates.</p>

<h2>One Real Pitfall: Promotions Distort the Signal</h2>
<p>Not every price-and-quantity pair in your history is a clean signal. A period where you ran a discount or a promotion will show a lot of units sold at a low price, but that spike reflects the promotion, not your customers' normal price sensitivity. Left uncorrected, that data point can pull the whole elasticity estimate in the wrong direction. Zorin's model automatically flags statistical outliers in your sales history, most commonly promotional spikes, and excludes them from the fit so your baseline elasticity reflects normal buying behavior, not sale-week behavior.</p>

<h2>Test Before You Commit</h2>
<p>Once you have an elasticity estimate, you don't have to trust it blindly. A what-if simulator lets you drag through candidate prices and see the projected profit lift at each one before you touch your live listing. If the projected lift at $85 looks strong and the projected lift at $95 looks worse, you're seeing the shape of your own demand curve, not someone else's rule of thumb.</p>

<h2>Putting It Together</h2>
<p>Knowing what to price a product isn't about finding the "right" number in the abstract. It's about reading what your own sales history already tells you, correcting for anything that would distort the signal (like promotions), and checking the model's confidence before you act on it. That loop, upload data, fit elasticity, review confidence, test with a simulator, apply, is the entire mechanism, and it's specific to your store, not a category average or a competitor's storefront.</p>
<p>If you're not sure whether your current prices already reflect this, <a href="/blog/is-your-store-leaving-money-on-the-table">here's how to check</a>. And if you're comparing tools before committing to one, see <a href="/blog/shopify-pricing-apps-what-to-look-for">what actually matters in a Shopify pricing app</a>.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How do I know what to price my products?</h3>
<p>Read your own sales history at different price points to calculate price elasticity, then use that number to find the price that maximizes profit for that specific product.</p>
</div>
<div class="faq-item">
<h3>What is price elasticity in simple terms?</h3>
<p>It's a measure of how much your sales volume changes when your price changes. Low elasticity means customers barely notice a price change; high elasticity means they're very sensitive to it.</p>
</div>
<div class="faq-item">
<h3>Do I need a data science background to use elasticity pricing?</h3>
<p>No. A tool like Zorin runs the regression automatically from your uploaded sales history and gives you a plain raise, lower, or hold recommendation, not a raw statistical output you have to interpret yourself.</p>
</div>
<div class="faq-item">
<h3>How much sales history do I need before elasticity is reliable?</h3>
<p>More price variation and more data points produce a stronger fit. A model health badge (Strong, Fair, Weak) tells you how much to trust a given product's estimate rather than assuming every recommendation is equally certain.</p>
</div>
<div class="faq-item">
<h3>Should I just match my competitor's price instead?</h3>
<p>Not as a default. Their customers, channel, and cost structure differ from yours, so their price doesn't tell you what maximizes profit for your specific buyers.</p>
</div>
<div class="faq-item">
<h3>Do promotions mess up my pricing data?</h3>
<p>Yes, if they aren't excluded. A discount period shows inflated demand at an artificially low price, which can skew the elasticity estimate unless that period is flagged and removed from the model.</p>
</div>
<div class="faq-item">
<h3>Can I test a new price before actually changing it?</h3>
<p>Yes. A what-if simulator lets you preview the projected profit lift at different price points using your existing elasticity model before you apply anything.</p>
</div>
</section>

<p class="conclusion">The answer to "what should I price this at" has been sitting in your own order history the entire time. Elasticity is just the name for reading it properly, and once it's calculated, the right price follows from the math rather than a guess.</p>
    `.trim(),
  },
  {
    slug: "is-your-store-leaving-money-on-the-table",
    title: "Is Your Store Leaving Money on the Table?",
    excerpt:
      "Healthy sales can hide a pricing problem. Here are the actual signs your prices are wrong, and how to check.",
    date: "2026-07-28",
    readingTime: "7 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Your store is very likely leaving money on the table if you can't remember the last time you deliberately changed a price based on data, rather than a hunch, a competitor's move, or simply not touching it since launch. The signs are rarely dramatic. Healthy sales volume can sit right on top of a real pricing problem without anything obviously breaking.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Steady sales volume doesn't mean your pricing is optimal, it only means enough customers accept the current price.</li>
<li>No price changes in six months or more, competitor-copied prices, and no price-testing history are the clearest warning signs.</li>
<li>Checking means comparing your live price against what your own historical demand data says the profit-maximizing price would be.</li>
<li>There's no alert for quietly under-optimized pricing, so it has to be checked deliberately, not assumed away by healthy revenue.</li>
</ul>
</div>

<h2>Why "Sales Are Fine" Doesn't Mean Pricing Is Fine</h2>
<p>Revenue and profit are not the same signal. A product can sell steadily at a price that's meaningfully below what your actual demand curve would support, and you'd never see it in your top-line numbers, because the sales are still happening. The only way to know if a specific price is leaving profit on the table is to compare it against what your own historical demand data says the profit-maximizing price would be, not against whether units are moving.</p>

<h2>Four Signs Worth Checking</h2>

<h3>You haven't changed a price in six months or more</h3>
<p>Costs shift. Your product mix changes. Customer acquisition sources change, and different channels often bring in buyers with different price sensitivity. A price that was correct when you set it can quietly drift out of alignment with all of that, and nothing forces you to notice unless you're actively checking.</p>

<h3>You set prices by copying a competitor</h3>
<p>Matching a competitor's price assumes your buyers are identical to theirs. They found you through different marketing, in a possibly different market, expecting a possibly different value proposition. If your customers are actually less price-sensitive than a competitor's, matching their number means giving away margin you didn't need to give up.</p>

<h3>You've never tested a different price point</h3>
<p>Without price variation in your own history, there's no signal to read. If a product has had exactly one price its entire life, you have no data telling you whether $10 more would have cost you volume or simply added profit. This is the single biggest blind spot: no experiment means no evidence either way.</p>

<h3>Some products convert well and others don't, with no clear pattern</h3>
<p>Inconsistent conversion across similar products, with pricing set the same generic way for all of them, is often a sign that some are underpriced relative to what customers would actually pay, and others are overpriced relative to what the market will bear for that specific item.</p>

<h2>What "Checking" Actually Looks Like</h2>
<p>Checking isn't guessing harder. It's reading your own price-and-quantity history to calculate elasticity per product, the measurable relationship between a price change and the resulting change in demand. Zorin runs this calculation automatically from an uploaded sales history (or a live Shopify or WooCommerce sync) and returns a raise, lower, or hold recommendation for every SKU, along with an estimated profit lift and a confidence score based on how much reliable data supports it.</p>
<table>
  <thead>
    <tr><th>What the old approach sounds like</th><th>What the data actually says</th></tr>
  </thead>
  <tbody>
    <tr><td>"I'll try $79 and see what happens."</td><td>"Your elasticity is -1.2. Raising to $85 lifts profit an estimated 14%."</td></tr>
    <tr><td>"My competitor charges $89 so I'll charge $89."</td><td>"Your customers are less price-sensitive than that. You can likely charge $97."</td></tr>
    <tr><td>"I haven't touched prices in six months."</td><td>"Three products are under-priced relative to their own demand curve."</td></tr>
  </tbody>
</table>

<h2>Why This Is Easy to Miss Without a Systematic Check</h2>
<p>Nobody gets an alert when a price is quietly leaving 10 to 15% of achievable profit on the table. There's no error message, no dip in sales, nothing that forces the question. The only way to catch it is to periodically compare your live prices against what your own demand data says the profit-optimal price would be, product by product, rather than assuming steady sales means the pricing decision was correct.</p>

<h2>A Simple Way to Check Yourself</h2>
<p>Pick your five best-selling products. For each one, ask honestly: when did I last change this price, and was that decision based on anything other than a guess or a competitor's number? If the honest answer is "I don't remember" for more than a couple of them, that's the practical version of the sign to watch for, before you ever look at a formal elasticity number.</p>
<p>Once you've spotted a likely gap, <a href="/blog/how-do-i-know-what-to-price-my-products">here's how to actually calculate the right price</a> from your own sales data. And if a sale is part of the picture, <a href="/blog/how-to-run-a-sale-without-wrecking-your-margin">here's how to run one without corrupting that same data</a>.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How do I know if I'm leaving money on the table with my prices?</h3>
<p>Check whether you've ever deliberately tested a different price point for a product, backed by data. If a price has sat unchanged since launch or was copied from a competitor, there's a good chance it isn't optimized for your actual demand.</p>
</div>
<div class="faq-item">
<h3>Can healthy sales volume hide a pricing problem?</h3>
<p>Yes. Steady sales just mean the price is acceptable to enough customers, not that it's the price that maximizes profit. Those are different questions.</p>
</div>
<div class="faq-item">
<h3>What are the clearest warning signs?</h3>
<p>No price changes in six months or more, prices copied from competitors, no price testing history, and inconsistent conversion across similar products with no clear explanation.</p>
</div>
<div class="faq-item">
<h3>How often should I check my pricing?</h3>
<p>Often enough to catch cost or demand shifts, without reacting to every minor fluctuation. Reviewing your full catalog against fresh elasticity estimates on a regular cadence, such as monthly, is a reasonable default for most small catalogs.</p>
</div>
<div class="faq-item">
<h3>What metrics actually show whether a price change worked?</h3>
<p>Compare the estimated profit lift the model projected against what you actually observed in sales afterward, not just whether units sold. Volume alone doesn't tell you whether the change improved total profit.</p>
</div>
<div class="faq-item">
<h3>Do I need a lot of historical sales data to check this?</h3>
<p>More data and more price variation produce a more confident estimate, but even limited history gives a starting signal, flagged with a lower confidence score so you know to treat it cautiously.</p>
</div>
</section>

<p class="conclusion">The honest test isn't whether your store is profitable today. It's whether you can point to a reason, grounded in your own sales data, that your current prices are the ones that maximize that profit. If the answer is a shrug, there's very likely money sitting on the table you haven't measured yet.</p>
    `.trim(),
  },
  {
    slug: "should-you-price-differently-on-shopify-vs-amazon",
    title: "Should You Price Differently on Shopify vs Amazon?",
    excerpt:
      "Amazon and Shopify don't just have different fees, they often bring you genuinely different customers. Here's how to tell.",
    date: "2026-07-28",
    readingTime: "8 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Often, yes, and not just because of fees. Customers who buy on Amazon and customers who buy on your own Shopify store frequently have different price sensitivity, because they arrived through different channels with different expectations. The only reliable way to know if that's true for your specific catalog is to look at your own sales history on each channel separately, not assume it either way.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Amazon and Shopify shoppers often arrive with different buying contexts, which can produce genuinely different price elasticity for the same product.</li>
<li>Fitting elasticity per channel, instead of one blended model, avoids averaging two different customer populations into a misleading number.</li>
<li>Platform fees are a separate, real factor from elasticity: fees affect your break-even price, elasticity tells you what customers will pay.</li>
<li>Not every product needs channel-specific pricing. If the data shows similar elasticity on both, aligned pricing is simpler and just as correct.</li>
</ul>
</div>

<h2>Why Channels Can Have Genuinely Different Demand</h2>
<p>An Amazon shopper is often comparison-shopping in the moment, price-anchored by whatever else shows up on the same search results page. A Shopify shopper who lands on your own site has frequently already decided they want your specific brand, through an ad, a referral, or direct search for you by name. Those are different buying contexts, and they can produce measurably different price elasticity, the degree to which demand shifts when price shifts, even for the exact same product.</p>
<p>This isn't guaranteed to be true for every store. Some catalogs show similar elasticity across channels. The point is that you shouldn't assume either way. You should check.</p>

<h2>How to Actually Check, Instead of Guessing</h2>
<p>If your sales history separates orders by channel (Shopify direct sales vs. Amazon orders), you can fit an elasticity model per channel instead of one blended model across everything. This is exactly what a channel-aware pricing model does: it treats your Amazon sales history and your Shopify sales history as two separate demand signals, each with its own elasticity, R-squared fit, and recommendation.</p>
<table>
  <thead>
    <tr><th>Signal</th><th>Shopify</th><th>Amazon</th></tr>
  </thead>
  <tbody>
    <tr><td>Elasticity (illustrative)</td><td>-0.6 (less price-sensitive)</td><td>-1.9 (more price-sensitive)</td></tr>
    <tr><td>What it suggests</td><td>Room to raise price without losing many sales</td><td>Price increases risk losing volume faster</td></tr>
    <tr><td>Recommended action</td><td>Raise</td><td>Hold or small adjustment</td></tr>
  </tbody>
</table>
<p>These specific numbers are illustrative, not a claim about any particular store; the real values only come from your own channel-separated sales data.</p>

<h2>Fees Are Real, But They're a Separate Question From Elasticity</h2>
<p>Amazon's referral fee and any FBA fulfillment costs are a genuine, separate reason your break-even price differs by channel; that's simple cost math, not a demand question. Elasticity tells you what customers are willing to pay. Fees tell you what you actually keep after the platform takes its cut. Both matter, but conflating them leads to the wrong conclusion: a channel can have low elasticity (customers would tolerate a higher price) while also having high fees (you need a higher price just to hit the same margin), and the right response addresses both, not just one.</p>
<p><strong>A practical way to separate them:</strong> when you're comparing net profit per channel, use your realized price after fees as the number that feeds into your margin math. Use the raw customer-facing price as the number that feeds into elasticity, since that's what the customer actually reacted to.</p>

<h2>What This Looks Like in Practice</h2>
<p>Say a product is priced at $79 on both channels. If Shopify sales history shows demand barely moves at $85, and Amazon sales history shows demand drops noticeably above $79, that's your own customers telling you two different things about the same product. Raising the Shopify price and holding the Amazon price isn't inconsistency, it's responding to two different, real demand signals with two different, correct answers.</p>

<h2>A Common Mistake: One Price Set From One Blended Number</h2>
<p>If you calculate a single elasticity number across all channels combined, you're averaging two potentially different customer populations into one estimate that describes neither of them accurately. A store with a large, price-insensitive Shopify base and a smaller, price-sensitive Amazon presence could get a blended elasticity that undersells the Shopify opportunity and oversells the Amazon room to raise. Separating the signal by channel before fitting the model avoids that distortion entirely.</p>

<h2>When Prices Genuinely Should Match</h2>
<p>Not every product needs channel-specific pricing. If a product shows similar elasticity on both channels once you actually check, keeping the price aligned is simpler to manage and easier to explain if a customer ever compares the two. The goal isn't maximum differentiation for its own sake, it's letting the actual data decide, rather than assuming sameness or difference by default.</p>
<p>If you're still deciding which pricing tool can actually fit elasticity per channel for you, see <a href="/blog/shopify-pricing-apps-what-to-look-for">what to look for in a Shopify pricing app</a>. And if you haven't calculated a baseline elasticity for your catalog yet, start with <a href="/blog/how-do-i-know-what-to-price-my-products">how to know what to price your products</a>.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>Should I price the same product differently on Shopify vs Amazon?</h3>
<p>Often, yes, if your own sales history shows different price sensitivity between the two channels. Check the data per channel rather than assuming.</p>
</div>
<div class="faq-item">
<h3>Why would the same product have different demand on different channels?</h3>
<p>Shoppers arrive through different contexts. Amazon buyers are often actively comparison-shopping; direct Shopify buyers have frequently already chosen your brand, which can make them less price-sensitive.</p>
</div>
<div class="faq-item">
<h3>Is this just about Amazon's fees being higher?</h3>
<p>No. Fees affect your break-even price and are a separate, real factor, but elasticity is about what customers are willing to pay, which is a different question entirely.</p>
</div>
<div class="faq-item">
<h3>How do I know if my channels actually have different elasticity?</h3>
<p>Fit an elasticity model separately on each channel's own sales history rather than one blended model across all channels combined.</p>
</div>
<div class="faq-item">
<h3>What happens if I use one blended price across channels with different elasticity?</h3>
<p>You likely underprice on the less price-sensitive channel and risk losing volume on the more price-sensitive one, since one number can't correctly serve two different demand curves.</p>
</div>
<div class="faq-item">
<h3>Do prices always need to differ across channels?</h3>
<p>No. If the data shows similar elasticity on both, keeping prices aligned is simpler and just as correct. The decision should follow the data, not a default assumption either way.</p>
</div>
<div class="faq-item">
<h3>How do I separate elasticity from fee-adjusted margin in my thinking?</h3>
<p>Use the customer-facing price for elasticity (what customers actually reacted to), and use the fee-adjusted realized price for margin math (what you actually keep after the platform's cut).</p>
</div>
</section>

<p class="conclusion">Whether your prices should differ by channel isn't a branding question or a fee question alone, it's a demand question, and the answer is sitting in your own channel-separated sales history. Check it per channel before assuming either sameness or difference.</p>
    `.trim(),
  },
  {
    slug: "shopify-pricing-apps-what-to-look-for",
    title: "Shopify Pricing Apps: What to Look for Before You Buy",
    excerpt:
      "Most pricing apps guess or copy competitors. Here's what actually matters: your own data, a confidence score, and a review step.",
    date: "2026-07-28",
    readingTime: "9 min read",
    category: "Product",
    content: `
<p class="intro">If you're evaluating a Shopify pricing app, look for three things: does it learn from your own sales data instead of guessing or copying competitors, does it tell you how confident it is in a given recommendation, and does it let you review and test before anything actually changes. Most tools skip at least one of these, and that gap is usually where merchants get burned.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Pricing apps fall into three genuinely different categories: competitor repricers, rule-based discount tools, and elasticity-based tools that learn from your own sales data.</li>
<li>A confidence score matters as much as the recommendation itself, since it tells you how much data actually supports a given call.</li>
<li>A repricer answers "what is the market doing," while an elasticity tool answers "what will my customers actually pay."</li>
<li>Test on a small subset of your catalog before trusting a tool with everything, and confirm the recommendations track real outcomes first.</li>
</ul>
</div>

<h2>Three Genuinely Different Categories, Often Sold as One</h2>
<p>"Pricing app" covers tools that behave very differently underneath, and conflating them is the fastest way to pick the wrong one.</p>
<ul>
  <li><strong>Competitor repricers:</strong> track competitor prices and automatically match or undercut them based on rules you configure. They don't learn anything about your own customers.</li>
  <li><strong>Rule-based discount tools:</strong> apply markdowns or markups based on fixed rules (inventory age, category, manual overrides). Useful for automation, but not grounded in demand data.</li>
  <li><strong>Elasticity-based pricing tools:</strong> analyze your own historical sales at different price points to estimate demand sensitivity, then recommend a specific action with a stated confidence level.</li>
</ul>
<p>Zorin sits in that third category. It fits a demand model from your own sales history, not competitor data, and returns a raise, lower, or hold recommendation with an estimated profit lift and a confidence score, not a rule someone else's storefront determined for you.</p>

<h2>Five Things to Evaluate</h2>

<h3>Does it use your own sales data, or someone else's price?</h3>
<p>A tool that only watches competitors is telling you what someone else charges, not what your customers will actually pay. Ask directly: is the recommendation grounded in your own historical sales, or in an external number you have no control over?</p>

<h3>Does it show you a confidence score, not just an answer?</h3>
<p>A recommendation with no stated confidence level treats a product with thousands of data points the same as one with a handful. Look for a model health indicator (commonly labeled something like Strong, Fair, or Weak fit) so you know which recommendations to trust immediately and which need more data before you act.</p>

<h3>Does it explain the number, not just state it?</h3>
<p>A bare instruction ("change to $24.99") is homework, not a recommendation. A tool that shows the elasticity behind the call and the projected profit lift lets you sanity-check the logic instead of taking it on faith.</p>

<h3>Does it separate real demand signal from promotional noise?</h3>
<p>If your sales history includes discount periods, those spikes reflect the promotion, not your customers' normal price sensitivity. A model that doesn't account for this will produce a skewed estimate. Look for automatic promotion detection that excludes flagged periods from the underlying fit.</p>

<h3>Can you test before you commit?</h3>
<p>Can you preview the projected impact of a price change before it goes live? A what-if simulator that lets you try candidate prices against your own demand curve is a meaningfully different experience than committing blind and checking results a month later.</p>

<h2>Repricer vs. Elasticity Model: A Worked Comparison</h2>
<p>Say a competitor drops their price on a similar product from $30 to $26.</p>
<table>
  <thead>
    <tr><th></th><th>Competitor Repricer</th><th>Elasticity-Based Tool (Zorin)</th></tr>
  </thead>
  <tbody>
    <tr><td>What it reacts to</td><td>The competitor's price move</td><td>Your own historical demand curve, unaffected by a competitor's single move</td></tr>
    <tr><td>Typical response</td><td>Auto-drops to $26 or slightly under</td><td>No automatic change; recommendation stays grounded in your own elasticity estimate</td></tr>
    <tr><td>Risk</td><td>Can trigger a race-to-the-bottom price war with no regard for your own margin data</td><td>Recommendation reflects what your actual customers will pay, not a reaction to a rival</td></tr>
  </tbody>
</table>
<p>Neither approach is wrong for every use case, but they answer different questions. A repricer answers "what is the market doing." An elasticity tool answers "what will my customers actually pay."</p>

<h2>Is a Pricing App Worth It for a Small Store?</h2>
<p>This depends more on your catalog size and how much price variation exists in your history than on your revenue. A store with 50+ SKUs and enough sales history to show real price movement has plenty of signal to learn from. A brand-new store with a handful of products and no price history yet has very little for any model, elasticity-based or otherwise, to work with until more data accumulates.</p>
<ul>
  <li><strong>Established catalog, some price history:</strong> worth it immediately. You already have the signal, you're just not reading it systematically yet.</li>
  <li><strong>Brand-new store, no price history:</strong> less urgent today, though setting up sales tracking now means you'll have usable elasticity data sooner rather than later.</li>
  <li><strong>You've never once tested a different price point:</strong> worth prioritizing, since that's the exact blind spot elasticity modeling is built to close.</li>
</ul>

<h2>Testing Before You Trust It With Your Whole Catalog</h2>
<ol>
  <li><strong>Upload your full sales history</strong> for a handful of your best-tracked products first, ones with real price variation in the past.</li>
  <li><strong>Check the confidence score</strong> before acting on any recommendation, not just the raise/lower/hold call itself.</li>
  <li><strong>Use the what-if simulator</strong> to sanity-check a recommendation against a price you'd expect to work, before applying it.</li>
  <li><strong>Apply one product at a time</strong> initially, and watch whether the actual outcome tracks the projected lift.</li>
  <li><strong>Expand to the rest of your catalog</strong> once you trust the pattern of recommendations against real results.</li>
</ol>
<p>The trust-building step matters more than any single feature. The value of an AI-assisted recommendation holds up because you can see the reasoning and test it before it goes live, not because you're asked to believe it on faith.</p>
<p>Once you've picked a tool, <a href="/blog/is-your-store-leaving-money-on-the-table">check whether your current prices are already leaving profit on the table</a>. If a sale is coming up, see <a href="/blog/how-to-run-a-sale-without-wrecking-your-margin">how to discount without corrupting your pricing data</a>.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>What should I look for in a Shopify pricing app?</h3>
<p>A tool that learns from your own sales data rather than copying competitors, shows a confidence score for each recommendation, and lets you review and test before anything changes live.</p>
</div>
<div class="faq-item">
<h3>Are Shopify pricing apps worth it for a small store?</h3>
<p>Usually yes if you have an established catalog with some price history to learn from. Less urgent for a brand-new store with no price variation yet, though it's worth setting up tracking early.</p>
</div>
<div class="faq-item">
<h3>What's the difference between a competitor repricer and an elasticity-based pricing tool?</h3>
<p>A repricer reacts to what competitors charge. An elasticity-based tool, like Zorin, learns what your own customers are actually willing to pay from your own sales history.</p>
</div>
<div class="faq-item">
<h3>Can I test a pricing tool on a few products before rolling it out to my whole catalog?</h3>
<p>Yes. Most tools, including Zorin, support importing a subset, reviewing recommendations individually, and applying changes product by product before a full rollout.</p>
</div>
<div class="faq-item">
<h3>Why does a confidence score matter?</h3>
<p>It tells you how much historical data and price variation actually support a given recommendation, so you don't treat a data-thin estimate with the same certainty as a well-supported one.</p>
</div>
<div class="faq-item">
<h3>Do promotions affect how these tools work?</h3>
<p>They can, if not accounted for. A discount period inflates apparent demand at an artificially low price, so a well-built tool flags and excludes those spikes from the underlying model.</p>
</div>
<div class="faq-item">
<h3>Do these tools require a data science background to use?</h3>
<p>No. The statistical modeling happens automatically behind the scenes; you see a plain recommendation with a stated reason, not a raw regression output.</p>
</div>
</section>

<p class="conclusion">Picking the right pricing app isn't about the one with the most reviews. It's about whether the recommendation is grounded in your own customers' actual behavior, comes with an honest confidence level, and lets you test before you trust it with your whole catalog.</p>
    `.trim(),
  },
  {
    slug: "how-to-run-a-sale-without-wrecking-your-margin",
    title: "How to Run a Sale Without Wrecking Your Margin",
    excerpt:
      "Sales don't just risk your margin in the moment. Done wrong, they quietly corrupt the pricing data you rely on afterward.",
    date: "2026-07-28",
    readingTime: "8 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">The safest way to run a sale without wrecking your margin is to test the discount against your product's actual demand curve before applying it, and to make sure the promotional period gets excluded from your pricing data afterward so it doesn't distort future recommendations. Most of the damage from a bad sale isn't the discount itself, it's the corrupted signal that discount leaves behind in your sales history.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>A sale's biggest risk often isn't the discount itself, it's the corrupted pricing signal it leaves behind if the promo period isn't excluded from future data.</li>
<li>Test a discount against your product's own demand curve before applying it, rather than picking a round percentage that feels generous.</li>
<li>Promotional sales spikes should be flagged and excluded from your baseline elasticity, since customers respond more aggressively to visible discounts than to normal price changes.</li>
<li>A post-sale dip in demand is often temporary (customers who stocked up buying less afterward), not a sign your regular price is wrong.</li>
</ul>
</div>

<h2>A Sale's Real Cost Has Two Parts</h2>
<p>The obvious cost of a sale is the margin given up during the discount window. The less obvious cost is what that promotional period does to your pricing data afterward. A spike in sales at a low price during a sale doesn't reflect how customers behave at your normal price. If that spike gets treated as ordinary sales history, it skews your elasticity estimate going forward, and future recommendations end up built on a distorted picture of customer behavior.</p>

<h2>Test the Discount Before You Apply It</h2>
<p>Rather than picking a discount percentage that feels aggressive enough to move inventory, a what-if simulator lets you preview the projected profit impact of a specific sale price against your product's actual demand curve, using elasticity calculated from your own sales history. If your data suggests demand is fairly inelastic for a product, a deep discount may cost you more in margin than it gains in volume. If demand is highly elastic, a meaningful discount can genuinely lift total profit, not just total units sold.</p>
<table>
  <thead>
    <tr><th>Elasticity signal</th><th>What it suggests for a sale</th></tr>
  </thead>
  <tbody>
    <tr><td>Low elasticity (customers not very price-sensitive)</td><td>A deep discount likely costs more in margin than it gains in volume; a smaller discount may make more sense</td></tr>
    <tr><td>High elasticity (customers very price-sensitive)</td><td>A meaningful discount can plausibly lift total profit through volume, worth testing with the simulator first</td></tr>
  </tbody>
</table>
<p>Either way, the point is testing against your own data rather than picking a round number because it sounds generous.</p>

<h2>Not Every Product Needs the Same Discount</h2>
<p>Bestsellers already converting at full price rarely need a discount to move units, so discounting them mainly gives away margin you didn't need to give up. Slow-moving inventory has more room for a deeper cut, since unsold stock sitting in a warehouse often costs more over time than the margin given up to clear it. Treating every product in a catalog with one blanket discount percentage ignores this difference entirely.</p>

<h2>Flag the Promotional Period, Don't Let It Slip Into Your Baseline Data</h2>
<p>This is the step most sellers skip, and it's the one with the longest tail of consequences. If a sale period isn't excluded from the data your future pricing decisions are built on, it teaches the model, and effectively teaches you, the wrong lesson about how price-sensitive your customers really are. Promotional elasticity is typically higher than baseline elasticity: customers respond more aggressively to a visible discount than they would to the same percentage change at your regular price, and treating that as your normal elasticity overstates how much a future price cut would actually help.</p>
<p>Zorin's model automatically detects statistical outliers in your sales history, most commonly promotional spikes, and flags them for exclusion so your baseline elasticity estimate reflects ordinary buying behavior, not sale-week behavior. You can also manually confirm or override a flag if you know a spike had a different cause.</p>

<h2>Watch for the Post-Sale Dip</h2>
<p>A real pattern worth expecting: customers who stock up during a sale often reduce their normal purchasing for a period afterward, since they already bought what they needed at a discount. If you misread that natural dip as a sign your regular price is suddenly too high, you risk cutting a price that didn't actually need to change. Give the post-sale period a reasonable window before drawing conclusions from it.</p>

<h2>Pricing Back Up When the Sale Ends</h2>
<p>Resetting to "whatever it was before" without checking anything is a missed opportunity in one direction and a real risk in the other. If your baseline demand data (properly excluding the promo period) suggests the pre-sale price was already below the profit-maximizing point, the reset is a chance to correct that, not just restore the status quo. Run the same check you'd run on any price decision: does the current elasticity estimate, cleaned of promotional noise, support this specific number.</p>

<h2>A Simple Sequence for Running a Sale</h2>
<ol>
  <li><strong>Check elasticity before picking a discount</strong> instead of choosing a round percentage that feels right.</li>
  <li><strong>Segment bestsellers from slow movers</strong> rather than applying one blanket discount catalog-wide.</li>
  <li><strong>Use the simulator</strong> to preview projected impact at a specific sale price before it goes live.</li>
  <li><strong>Let the promo period get flagged</strong> as an outlier once the sale runs, so it doesn't corrupt future recommendations.</li>
  <li><strong>Give the post-sale period time</strong> before reading a temporary dip as a signal your regular price is wrong.</li>
</ol>
<p>If you're pricing across more than one storefront, the same discipline applies per channel, see <a href="/blog/should-you-price-differently-on-shopify-vs-amazon">should you price differently on Shopify vs Amazon</a>. And if you haven't checked your baseline elasticity recently, start with <a href="/blog/how-do-i-know-what-to-price-my-products">how to know what to price your products</a>.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How do I run a sale without wrecking my margin?</h3>
<p>Test the discount against your product's actual demand curve before applying it, and make sure the promotional period gets excluded from your pricing data afterward so it doesn't distort future recommendations.</p>
</div>
<div class="faq-item">
<h3>How do I decide which products to discount and by how much?</h3>
<p>Check elasticity per product rather than applying one blanket percentage. Bestsellers usually need little or no discount; slow-moving inventory can typically absorb more.</p>
</div>
<div class="faq-item">
<h3>Do promotions mess up my future pricing recommendations?</h3>
<p>Yes, if the promotional sales spike isn't excluded from the data. It inflates apparent demand at an artificially low price and can distort your baseline elasticity estimate going forward.</p>
</div>
<div class="faq-item">
<h3>How does a tool know a spike in sales was a promotion and not real demand?</h3>
<p>Statistical outlier detection flags unusually high sales relative to the fitted model as likely promotional activity, which you can confirm or override manually.</p>
</div>
<div class="faq-item">
<h3>Why do sales sometimes dip right after a promotion ends?</h3>
<p>Customers who stocked up during the discount often buy less than usual for a period afterward. That's a temporary pattern, not necessarily a sign your regular price is too high.</p>
</div>
<div class="faq-item">
<h3>How do I price back up after a sale ends?</h3>
<p>Check your baseline elasticity, with the promotional period excluded, against your planned reset price rather than assuming the pre-sale price is automatically correct.</p>
</div>
<div class="faq-item">
<h3>Can I preview the impact of a discount before applying it?</h3>
<p>Yes. A what-if simulator lets you test candidate sale prices against your product's demand curve and see the projected impact before anything goes live.</p>
</div>
</section>

<p class="conclusion">A sale's biggest risk usually isn't the discount you can see, it's the corrupted signal it can leave behind if the promotional period bleeds into your regular pricing data. Test the discount against your own demand curve, flag the promo period afterward, and give the post-sale window time before drawing conclusions from it.</p>
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
