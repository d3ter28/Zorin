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
    slug: "why-do-my-bestsellers-and-slow-sellers-need-different-pricing-strategies",
    title: "Why Do My Bestsellers and Slow Sellers Need Different Pricing Strategies?",
    excerpt:
      "Treating your whole catalog with one pricing rule ignores that a hot seller and a stale SKU are answering completely different questions.",
    date: "2026-07-30",
    readingTime: "7 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Bestsellers and slow sellers need different pricing strategies because they're solving different problems: a bestseller's question is how much more profit you can extract from demand that's already proven, while a slow seller's question is whether the price itself, not the product, is the reason it isn't moving. Applying one blanket pricing rule across a catalog treats both as if they were the same problem, and that's usually where margin gets left on the table or dead stock quietly piles up.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>A bestseller has proven demand, so the pricing question is usually whether you can raise price without meaningfully denting that demand.</li>
<li>A slow seller's pricing question is different: is a lower price the thing that would actually move it, or is the problem elsewhere (visibility, positioning, fit)?</li>
<li>Elasticity, calculated separately per product, naturally reflects this difference rather than requiring you to guess which category a product falls into.</li>
<li>A single catalog-wide discount or markup ignores this split and usually overcorrects one group while undercorrecting the other.</li>
<li>Reviewing your catalog by segment (proven sellers vs. thin performers) is more useful than reviewing it as one undifferentiated list.</li>
</ul>
</div>

<h2>Two Different Questions Wearing the Same Label</h2>
<p>"What should I price this at" sounds like one question, but it means something different depending on the product. For a bestseller, demand at the current price is already proven, so the real question is whether that price is leaving profit on the table, whether a modest increase would barely dent volume while meaningfully raising margin. For a slow seller, demand hasn't been proven at all, and the question is whether price is even the actual obstacle, or whether the product simply isn't reaching the right customers.</p>

<h2>Why a Bestseller's Elasticity Often Supports a Higher Price Than You'd Guess</h2>
<p>A product selling consistently at its current price doesn't automatically mean the current price is optimal, it means the price is acceptable to enough customers to generate steady volume. If the elasticity estimate for that product is low (customers not very price-sensitive), there's often real room to raise price without losing much volume, and the resulting margin gain applies to every unit you're already selling. This is easy to miss precisely because nothing about steady sales signals a problem.</p>

<h2>Why a Slow Seller's Problem Might Not Be Price at All</h2>
<p>It's tempting to assume a slow-moving product just needs a discount to move. Sometimes that's true. Often, the real issue is visibility, positioning, or simply weaker product-market fit, none of which a lower price actually fixes. Elasticity can help here too: if a product's estimated elasticity is high (very price-sensitive) and it's still not moving even at a reasonable price, that's a signal worth investigating beyond pricing. If elasticity is low and it's still not moving, a discount is unlikely to be the fix, since customers weren't especially price-sensitive to begin with.</p>

<table>
  <thead>
    <tr><th>Segment</th><th>Typical question</th><th>What elasticity often shows</th><th>Likely lever</th></tr>
  </thead>
  <tbody>
    <tr><td>Bestseller</td><td>Am I leaving margin on the table?</td><td>Often lower elasticity; demand already proven</td><td>Test a modest price increase</td></tr>
    <tr><td>Steady mid-performer</td><td>Is this priced about right?</td><td>Moderate elasticity, reasonable confidence</td><td>Standard review cadence, minor adjustments</td></tr>
    <tr><td>Slow seller</td><td>Is price actually the obstacle?</td><td>Varies; low elasticity suggests price isn't the fix</td><td>Investigate visibility/fit before discounting</td></tr>
  </tbody>
</table>

<h2>Why One Blanket Rule Overcorrects Both Groups</h2>
<p>A catalog-wide discount treats a bestseller and a slow seller identically, giving away margin on the bestseller that didn't need to be given up, while possibly still not being enough to move the slow seller if price wasn't the real obstacle. A catalog-wide price increase has the mirror problem: it might work fine on inelastic bestsellers but push an already-struggling slow seller further from moving at all. Segmenting the catalog before applying any blanket rule avoids both mistakes at once.</p>

<h2>How to Actually Segment Your Catalog</h2>
<p>Rather than manually deciding which products count as "bestsellers" and which count as "slow," let each product's own sales history and calculated elasticity do that sorting for you. A product with strong, consistent volume and low price sensitivity behaves like a bestseller regardless of what category you'd have put it in by instinct. A product with thin data or weak demand at any price tested behaves like a genuine slow seller, and deserves a different conversation than a pricing tweak.</p>

<h2>A Practical Way to Review a Mixed Catalog</h2>
<ol>
  <li><strong>Sort by confidence and elasticity</strong> rather than by gut-feel category labels.</li>
  <li><strong>Test a modest price increase</strong> on low-elasticity, high-confidence bestsellers first, where the upside is clearest.</li>
  <li><strong>Investigate slow sellers beyond price</strong> before assuming a discount is the fix, especially if elasticity is already low.</li>
  <li><strong>Avoid one blanket rule</strong> across the whole catalog for either a sale or a general price adjustment.</li>
</ol>
<p>If you want to see this split for your own catalog rather than guessing which products fall into which group, <a href="/signup">upload your sales history</a> and review each product's own elasticity and confidence score.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>Why do bestsellers and slow sellers need different pricing strategies?</h3>
<p>A bestseller's question is whether you can raise price without losing much proven demand. A slow seller's question is whether price is even the actual obstacle, which a discount doesn't necessarily fix.</p>
</div>
<div class="faq-item">
<h3>Should I ever raise the price of my bestselling product?</h3>
<p>If its elasticity is low, meaning customers aren't very price-sensitive, a modest increase can often raise margin without meaningfully denting volume.</p>
</div>
<div class="faq-item">
<h3>Will discounting a slow-moving product always help it sell?</h3>
<p>Not necessarily. If the product's elasticity is low, price isn't the main driver of its performance, and a discount may not fix an underlying visibility or fit problem.</p>
</div>
<div class="faq-item">
<h3>How do I know which category a product falls into?</h3>
<p>Its own elasticity and confidence score, calculated from its actual sales history, naturally reflect this rather than requiring you to guess based on instinct.</p>
</div>
<div class="faq-item">
<h3>Is a catalog-wide discount ever a good idea?</h3>
<p>It can work for a genuine, time-limited event, but it typically overcorrects bestsellers (giving away unneeded margin) while possibly undercorrecting slow sellers if price wasn't their real problem.</p>
</div>
<div class="faq-item">
<h3>What should I check before discounting a slow seller?</h3>
<p>Whether its elasticity is actually high enough that price is a meaningful lever, versus a visibility or positioning issue a lower price wouldn't solve.</p>
</div>
<div class="faq-item">
<h3>Do I need to manually categorize my products?</h3>
<p>No. Elasticity and confidence, calculated per product, naturally sort your catalog by how it should be treated without requiring manual labeling.</p>
</div>
</section>

<p class="conclusion">A catalog isn't one pricing problem, it's many small ones that happen to share a dashboard. Let each product's own data tell you whether it's a bestseller with room to raise, or a slow seller whose real problem might not be its price at all.</p>
    `.trim(),
  },
  {
    slug: "do-i-need-a-data-analyst-to-price-my-products-well",
    title: "Do I Need a Data Analyst to Price My Products Well?",
    excerpt:
      "The math behind good pricing is real statistics, but you don't have to be the one running it by hand.",
    date: "2026-07-30",
    readingTime: "6 min read",
    category: "Education",
    content: `
<p class="intro">No, you don't need a data analyst to price your products well. The underlying math, elasticity modeling from your sales history, is genuinely statistical, but the calculation itself can run automatically the moment you upload your sales data. What used to require a dedicated analyst is now a mechanical step, not a skill you personally need to acquire.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Elasticity modeling is real statistics, but running the calculation doesn't require you to understand the underlying regression, just upload sales history and read the output.</li>
<li>The gap a dedicated pricing analyst used to close, systematically reading your own sales data, can now be closed by a tool rather than a hire.</li>
<li>What you actually need to bring is judgment: reviewing a recommendation, understanding your own product context, and deciding whether to apply it.</li>
<li>A confidence score exists specifically so you don't need statistical training to know how much to trust a given output.</li>
<li>Hiring a dedicated analyst still makes sense at a certain scale, but that threshold is much higher than most SMB merchants assume.</li>
</ul>
</div>

<h2>Why This Question Comes Up So Often</h2>
<p>Pricing discussions are full of statistical language, elasticity, regression, confidence intervals, and it's reasonable to assume that anything described that way requires a specialist to actually use. That assumption made more sense when the only way to get an elasticity estimate was to build a spreadsheet model yourself or hire someone who could. It makes much less sense now that the calculation itself is automatable.</p>

<h2>What a Pricing Analyst Actually Used to Do</h2>
<p>Historically, a pricing analyst's core job was reading a company's own sales data systematically: gathering price and quantity history, running a regression to estimate elasticity, checking the fit of that model, and translating the output into a recommendation a non-technical stakeholder could act on. None of those steps require a human specifically, they require a process, and a process is exactly what a modeling tool automates.</p>

<h2>What You Actually Need to Bring Instead</h2>
<p>The parts of pricing that genuinely still need a human are judgment calls a model can't make for you: knowing that a product is seasonal for reasons the data alone won't show, recognizing when a competitor's move is temporary versus permanent, deciding whether a recommendation makes sense given something you know about your own customers that isn't captured in the sales history. A tool hands you the statistical output. You still decide what to do with it.</p>

<h2>How the Automation Actually Works</h2>
<p>You upload your sales history, a CSV export or a live Shopify or WooCommerce sync, and the tool fits a log-log regression per product automatically. The output isn't a raw statistical readout, it's a plain recommendation: raise, lower, or hold, alongside an estimated profit lift and a confidence label based on how much data supports the estimate. The regression happens, but you never have to run it, read it, or defend the math behind it yourself.</p>

<table>
  <thead>
    <tr><th>What an analyst used to do by hand</th><th>What happens automatically now</th></tr>
  </thead>
  <tbody>
    <tr><td>Gather price and quantity history per product</td><td>Reads directly from an uploaded CSV or a live sync</td></tr>
    <tr><td>Run a regression to estimate elasticity</td><td>Fits the model automatically per SKU</td></tr>
    <tr><td>Check the statistical fit before trusting the output</td><td>Returns an R-squared score and a confidence label</td></tr>
    <tr><td>Translate the output into a plain recommendation</td><td>Returns raise/lower/hold with an estimated profit lift</td></tr>
  </tbody>
</table>

<h2>Why the Confidence Score Matters Here Specifically</h2>
<p>Without a background in statistics, it's hard to know from a raw elasticity number alone whether it's actually reliable. A confidence label (commonly something like Strong, Fair, or Weak fit) exists specifically to close that gap, telling you plainly whether a given estimate has enough data behind it to trust, without requiring you to interpret an R-squared value yourself.</p>

<h2>When a Dedicated Analyst Still Makes Sense</h2>
<p>At a large enough scale, with a catalog spanning thousands of SKUs, multiple markets, and pricing questions that go beyond single-product elasticity (bundling strategy, cross-product cannibalization, complex promotional calendars), a dedicated analyst or pricing team earns their keep. That threshold is far higher than most SMB merchants operating a lean one-to-five-person team, which is exactly the gap automated elasticity modeling is built to close in the meantime.</p>

<h2>What This Means for a Lean Team</h2>
<p>You don't need to learn statistics, hire someone who has, or build a spreadsheet model to price well. You need a way to read your own sales data systematically, which a tool can do automatically, and the judgment to apply the resulting recommendation with your own product context in mind. If you want to see what your own catalog's elasticity looks like without doing the math yourself, <a href="/signup">upload your sales history</a> and let the model run.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>Do I need a data analyst to price my products well?</h3>
<p>No. The underlying elasticity modeling can run automatically once you upload your sales history, without requiring you to understand or run the regression yourself.</p>
</div>
<div class="faq-item">
<h3>What did a pricing analyst actually do before automation?</h3>
<p>Gathered price and quantity history, ran a regression to estimate elasticity, checked the statistical fit, and translated the result into a plain recommendation.</p>
</div>
<div class="faq-item">
<h3>What do I still need to do myself?</h3>
<p>Bring judgment: reviewing a recommendation against your own knowledge of the product and deciding whether to apply it, since a model doesn't know everything about your business context.</p>
</div>
<div class="faq-item">
<h3>How do I know if a recommendation is reliable without statistics training?</h3>
<p>A confidence label (Strong, Fair, Weak) tells you plainly how much data supports a given estimate, without requiring you to interpret raw statistical output yourself.</p>
</div>
<div class="faq-item">
<h3>Does this replace a pricing analyst entirely?</h3>
<p>For most SMB catalogs, yes, the core function (reading your own sales data systematically) is what gets automated. At a much larger scale with more complex pricing questions, a dedicated analyst still adds value.</p>
</div>
<div class="faq-item">
<h3>What data do I need to provide for this to work?</h3>
<p>Your sales history, typically a CSV export with date, SKU, units sold, and price, or a live sync from Shopify or WooCommerce.</p>
</div>
<div class="faq-item">
<h3>Is the underlying math still real statistics?</h3>
<p>Yes. A log-log regression genuinely runs behind the scenes, it's just automated rather than something you need to perform or understand yourself.</p>
</div>
</section>

<p class="conclusion">The statistics behind good pricing are real, but running them by hand was always the bottleneck, not a requirement you personally need to meet. Automate the calculation, bring your own judgment to the recommendation, and the analyst-sized gap closes without an analyst-sized hire.</p>
    `.trim(),
  },
  {
    slug: "whats-a-good-profit-margin-for-an-online-store",
    title: "What's a Good Profit Margin for an Online Store?",
    excerpt:
      "Industry benchmarks are a starting point, not an answer. Here's why your own number matters more than the average.",
    date: "2026-07-30",
    readingTime: "7 min read",
    category: "Education",
    content: `
<p class="intro">A commonly cited benchmark for online stores is 60 to 70% gross margin and 10 to 20% net margin, though this varies meaningfully by category and business model. The more useful answer, though, is that a "good" margin for your specific store is whatever your own cost structure and demand curve actually support, not an industry average copied from a blog post. Benchmarks are a sanity check, not a target to force your pricing toward.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Commonly cited ecommerce benchmarks run 60-70% gross margin and 10-20% net margin, varying meaningfully by category and business model.</li>
<li>An industry average tells you roughly where stores like yours tend to land, not what your specific margin should be.</li>
<li>The gap between gross and net margin is often 35-40 percentage points, so tracking gross margin alone can hide a real profitability problem.</li>
<li>Your own elasticity and cost structure, not a benchmark, determine the actual profit-maximizing price for each product.</li>
<li>A margin that matches the industry average on paper can still be leaving profit on the table for your specific customer base.</li>
</ul>
</div>

<h2>What the Commonly Cited Numbers Actually Say</h2>
<p>Industry benchmarks suggest average ecommerce stores run somewhere around 60-65% gross margin, with dropshipping models often higher (65-70%) and private-label or self-produced goods slightly lower (60-65%). On the net margin side, 5% is generally considered low, 10% average, and 20% or higher considered strong for sustainable long-term growth. These numbers are a reasonable starting orientation, especially if you have no other reference point yet.</p>

<table>
  <thead>
    <tr><th>Margin type</th><th>Commonly cited range</th><th>What it measures</th></tr>
  </thead>
  <tbody>
    <tr><td>Gross margin</td><td>60-70%</td><td>Revenue minus cost of goods sold, before operating expenses</td></tr>
    <tr><td>Net margin</td><td>10-20%</td><td>What's left after all operating costs, the real bottom-line profitability</td></tr>
  </tbody>
</table>
<p>These figures are general industry benchmarks, not a guarantee for any specific store; actual healthy margins vary by product category and business model.</p>

<h2>Why the Gap Between Gross and Net Margin Matters</h2>
<p>The difference between gross and net margin commonly runs 35 to 40 percentage points, meaning a store with an impressive-looking 65% gross margin might still only be netting 10-15% after everything else is accounted for. Tracking gross margin alone can create a false sense of security. The number that actually determines whether your business is healthy is net margin, not the more flattering gross figure.</p>

<h2>Why a Benchmark Can't Tell You Your Actual Number</h2>
<p>An industry average describes where stores like yours tend to land on average, not what your specific product, cost structure, and customer base can actually support. Two stores selling similar products can have meaningfully different optimal margins if their customers have different price sensitivity, their supplier costs differ, or their acquisition channels bring in different kinds of buyers. Chasing a benchmark number as a target can mean underpricing a product whose actual demand would support a higher margin, or overpricing one where your specific customers are more price-sensitive than the category average.</p>

<h2>What Actually Determines Your Real Optimal Margin</h2>
<p>Your true landed cost (including fees, shipping, and returns) sets the floor. Your product's elasticity, how much demand shifts with price, calculated from your own sales history, tells you how far above that floor you can reasonably price without losing more in volume than you gain in margin. Neither number comes from an industry average. Both come from your own store's actual data.</p>

<h2>Using Benchmarks the Right Way</h2>
<p>Treat an industry benchmark as a sanity check, not a target. If your margin is dramatically below the typical range for your category, that's worth investigating, maybe your costs are unusually high, or your pricing is more conservative than your customers would actually tolerate. If your margin already sits within a normal range, that alone doesn't mean it's optimal for your specific catalog; it just means it's not an outlier.</p>

<h2>A More Useful Question Than "What's a Good Margin"</h2>
<p>Rather than asking what margin is generically good, ask whether your current margin, for each specific product, matches what your own elasticity and cost data would recommend. That's a more precise question with a more actionable answer, one product can genuinely support a higher margin than the industry average, and another might need to sit lower to move at the volume your business needs.</p>
<p>If you want to see where your own products actually sit relative to their profit-maximizing price, rather than an industry average, <a href="/blog/is-your-store-leaving-money-on-the-table">here's how to check</a>, or <a href="/signup">connect your sales history</a> directly.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>What's a good profit margin for an online store?</h3>
<p>Commonly cited benchmarks run 60-70% gross margin and 10-20% net margin, though your own optimal number depends on your specific costs and customer demand, not the industry average alone.</p>
</div>
<div class="faq-item">
<h3>What's the difference between gross and net margin?</h3>
<p>Gross margin is revenue minus cost of goods sold. Net margin subtracts all other operating costs too, and is a more accurate measure of actual profitability.</p>
</div>
<div class="faq-item">
<h3>Why might my margin be within the normal range but still not optimal?</h3>
<p>An industry average describes where stores like yours typically land, not what your specific demand curve and cost structure can support. Being "normal" doesn't mean it's your profit-maximizing number.</p>
</div>
<div class="faq-item">
<h3>Should I aim to match the industry average margin?</h3>
<p>Use it as a sanity check rather than a target. Your own elasticity and cost data determine your actual optimal margin, which may sit above or below the average.</p>
</div>
<div class="faq-item">
<h3>Why do gross and net margin sometimes look so different?</h3>
<p>Operating costs beyond cost of goods sold (fees, overhead, returns) commonly eat 35-40 percentage points between the two, so a strong gross margin can still mask a weak net margin.</p>
</div>
<div class="faq-item">
<h3>Does margin vary a lot by product category?</h3>
<p>Yes, significantly. Benchmarks differ meaningfully across categories and business models (dropshipping vs. private label, for example), so a single universal number rarely applies well.</p>
</div>
<div class="faq-item">
<h3>How do I find my actual optimal margin instead of guessing from a benchmark?</h3>
<p>Calculate your true landed cost as a floor, then use your product's own elasticity, from its actual sales history, to determine how far above that floor your specific customers will support.</p>
</div>
</section>

<p class="conclusion">Industry benchmarks are a reasonable starting orientation, not a substitute for your own numbers. Your actual optimal margin lives in your own cost structure and your own customers' demand, not in an average calculated across thousands of stores that aren't yours.</p>
    `.trim(),
  },
  {
    slug: "should-i-raise-prices-to-cover-rising-costs",
    title: "Should I Raise Prices to Cover Rising Costs?",
    excerpt:
      "Usually yes, but the timing and size of the increase matter more than the decision to raise at all.",
    date: "2026-07-30",
    readingTime: "7 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Usually, yes, if your supplier costs, fees, or fulfillment expenses have genuinely risen, absorbing that increase indefinitely just shrinks your margin quietly instead of addressing it directly. The harder question isn't whether to raise prices, it's how much and how fast, since a poorly timed or oversized increase can cost you more in lost customers than the cost increase itself would have.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Absorbing a real, sustained cost increase without adjusting price simply shrinks your margin over time rather than solving the underlying problem.</li>
<li>Small businesses generally have less room to absorb rising costs than larger companies, making pass-through more necessary, not less.</li>
<li>Timing and framing matter: raising prices too abruptly, without a clear reason communicated, risks losing customers you didn't need to lose.</li>
<li>Your product's elasticity tells you how much of the cost increase can realistically be passed through without a disproportionate volume loss.</li>
<li>Cost management (renegotiating supplier terms, cutting non-essential spend) is a complement to a price increase, not a full substitute for one.</li>
</ul>
</div>

<h2>Why Absorbing Costs Indefinitely Isn't Actually Neutral</h2>
<p>It can feel safer to hold your price steady and absorb a cost increase rather than risk upsetting customers with a higher number. But holding price steady while costs rise isn't a neutral choice, it's a slow, quiet decision to shrink your margin every single sale, indefinitely, until you eventually address it. Small businesses in particular tend to have less margin cushion to absorb rising costs than larger companies, which makes this trade-off more urgent, not less.</p>

<h2>The Real Question: How Much and How Fast, Not Whether</h2>
<p>Once a cost increase is real and sustained, not a temporary blip, the decision to eventually pass some of it through is usually necessary for the business to stay healthy. The genuinely important decisions are about size and timing: raising prices too abruptly or too far beyond what the increase actually warrants risks losing customers who would have tolerated a smaller, better-timed adjustment.</p>

<h2>Let Elasticity Set the Ceiling on What's Realistic</h2>
<p>Your product's elasticity, calculated from its own sales history, tells you roughly how much volume you'd expect to lose for a given price increase. If demand is fairly inelastic, a cost-driven increase can likely be passed through close to fully without a disproportionate hit to volume. If demand is highly elastic, passing through the full cost increase risks losing more in volume than the increase gains in margin, and a partial pass-through, absorbing some of the cost yourself, may be the more profitable choice even though it feels less "fair" on paper.</p>

<table>
  <thead>
    <tr><th>Elasticity signal</th><th>What it suggests for cost pass-through</th></tr>
  </thead>
  <tbody>
    <tr><td>Low elasticity (inelastic)</td><td>Passing through most or all of the cost increase is likely to preserve or improve total profit</td></tr>
    <tr><td>High elasticity (elastic)</td><td>Full pass-through risks a bigger volume hit than the cost increase justifies; consider partial absorption</td></tr>
  </tbody>
</table>

<h2>Timing and Framing Matter More Than Most Merchants Expect</h2>
<p>A sudden, large price jump can shock customers accustomed to a stable price in a way a smaller, better-timed increase wouldn't, independent of whether the new price is objectively justified by real cost increases. It's also worth watching competitors' pricing as a reference point, since raising prices well ahead of comparable stores, without a clear reason, risks losing price-sensitive customers to an alternative that hasn't moved yet.</p>

<h2>Cost Management Isn't a Substitute, But It Helps</h2>
<p>Before or alongside a price increase, it's worth exploring whether some of the pressure can be relieved without touching price at all: renegotiating supplier terms, consolidating orders for bulk pricing, or cutting non-essential spend. None of this replaces a genuinely necessary price increase if input costs have risen meaningfully, but it can reduce how much of the increase actually needs to reach the customer.</p>

<h2>A Practical Sequence for a Cost-Driven Increase</h2>
<ol>
  <li><strong>Confirm the cost increase is real and sustained</strong>, not a temporary spike that might reverse on its own.</li>
  <li><strong>Check what cost relief is available elsewhere first</strong> (supplier terms, non-essential spend) before assuming the full increase must be passed through.</li>
  <li><strong>Use your product's own elasticity</strong> to estimate how much of the increase can be passed through without a disproportionate volume loss.</li>
  <li><strong>Size and time the increase deliberately</strong> rather than reacting abruptly the moment costs rise.</li>
  <li><strong>Watch the actual outcome against what elasticity predicted</strong>, the same way you would for any other price change.</li>
</ol>
<p>If you want to know how much of a specific cost increase your own customers would likely tolerate, <a href="/blog/what-does-price-elasticity-actually-mean">calculate your product's elasticity</a> first, or <a href="/signup">connect your sales history</a> to see it directly.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>Should I raise prices to cover rising costs?</h3>
<p>Usually yes, if the cost increase is real and sustained. Absorbing it indefinitely just shrinks your margin quietly rather than addressing the underlying problem.</p>
</div>
<div class="faq-item">
<h3>How much of a cost increase should I pass through to customers?</h3>
<p>It depends on your product's elasticity. Low elasticity supports passing through most or all of the increase; high elasticity may make partial absorption more profitable overall.</p>
</div>
<div class="faq-item">
<h3>Is it risky to raise prices during inflation?</h3>
<p>The bigger risk is usually in the size and timing of the increase, not the decision to raise prices at all. A sudden, large jump is riskier than a smaller, well-timed one.</p>
</div>
<div class="faq-item">
<h3>Should I check competitor prices before raising mine?</h3>
<p>It's worth being aware of where competitors sit, since raising prices well ahead of comparable stores without a clear reason risks losing price-sensitive customers to an alternative.</p>
</div>
<div class="faq-item">
<h3>What can I do besides raising prices to manage rising costs?</h3>
<p>Renegotiating supplier terms, consolidating orders for bulk pricing, and cutting non-essential spend can relieve some pressure, though they rarely replace a genuinely necessary price increase entirely.</p>
</div>
<div class="faq-item">
<h3>Do small businesses have less room to absorb rising costs than large ones?</h3>
<p>Generally yes, which makes timely, deliberate price adjustments more important for small businesses, not less, compared to larger companies with more margin cushion.</p>
</div>
<div class="faq-item">
<h3>How do I know if a cost increase is temporary or worth reacting to?</h3>
<p>If it's sustained across more than one order cycle and doesn't look like a one-off supplier or shipping fluctuation, it's usually worth treating as a real, ongoing cost change.</p>
</div>
</section>

<p class="conclusion">Raising prices to cover a real, sustained cost increase usually isn't the risky part, it's the size and timing of the increase that determines whether it protects your margin or costs you more in lost customers than the original cost increase would have. Let your product's own elasticity guide how much is realistic.</p>
    `.trim(),
  },
  {
    slug: "how-do-i-set-prices-for-my-whole-catalog-without-doing-it-one-by-one",
    title: "How Do I Set Prices for My Whole Catalog Without Doing It One by One?",
    excerpt:
      "Reviewing hundreds of SKUs individually doesn't scale for a lean team. Here's how to price a whole catalog without burning a week on it.",
    date: "2026-07-30",
    readingTime: "7 min read",
    category: "Product",
    content: `
<p class="intro">You can price a whole catalog without reviewing every product manually by letting each SKU's own elasticity model generate a recommendation automatically, then applying the ones you trust in bulk while reviewing individually only the products flagged with lower confidence or bigger changes. The manual, one-by-one approach isn't a discipline worth admiring, it's a bottleneck that doesn't scale past a small handful of products.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>A catalog-wide view that shows every product's recommendation and estimated profit lift at once replaces reviewing SKUs one at a time.</li>
<li>Bulk applying is safe for high-confidence recommendations, while low-confidence or unusually large changes are worth a quick individual look first.</li>
<li>Per-product independence during a bulk apply matters: a failure or issue on one SKU shouldn't block the rest of the catalog from updating.</li>
<li>Starting with a subset before trusting the whole catalog to bulk apply is a reasonable way to build confidence in the pattern of recommendations.</li>
<li>The goal isn't zero human review, it's concentrating your limited review time on the products that actually need it.</li>
</ul>
</div>

<h2>Why One-by-One Doesn't Scale</h2>
<p>Reviewing ten products individually is manageable for an afternoon. Reviewing a few hundred, the reality for many established SMB catalogs, simply isn't, not without either a dedicated team or an unreasonable amount of time taken away from running the rest of the business. The manual approach isn't more careful, it's just slower, and slowness at that scale usually means most of the catalog never gets reviewed at all, not that it gets reviewed thoroughly.</p>

<h2>What a Catalog-Wide View Actually Replaces</h2>
<p>Instead of opening each product's page individually, a catalog view shows every SKU's recommendation (raise, lower, or hold) and estimated profit lift in one list, sortable and scannable in a single pass. This turns "review my whole catalog" from a multi-day task into something you can meaningfully process in one sitting, because you're scanning a list of outcomes rather than re-deriving each one from scratch.</p>

<table>
  <thead>
    <tr><th>Product</th><th>Recommendation</th><th>Est. profit lift</th></tr>
  </thead>
  <tbody>
    <tr><td>Wireless Headphones</td><td>Raise</td><td>+18.3%</td></tr>
    <tr><td>Mechanical Keyboard</td><td>Lower</td><td>+6.1%</td></tr>
    <tr><td>Ergonomic Mouse</td><td>Hold</td><td>—</td></tr>
    <tr><td>USB-C Hub</td><td>Raise</td><td>+11.7%</td></tr>
  </tbody>
</table>
<p>This table is illustrative of the format, not a claim about any specific catalog; actual recommendations depend entirely on each product's own sales history.</p>

<h2>Where Bulk Applying Is Genuinely Safe</h2>
<p>A high-confidence recommendation, backed by a strong model fit and a meaningful volume of historical data, is a reasonable candidate for bulk applying without individual review, since the statistical support behind it is already substantial. This is where most of your time savings actually come from: not skipping review entirely, but not needing to re-verify a conclusion that's already well supported.</p>

<h2>Where Individual Review Still Earns Its Keep</h2>
<p>A Weak-confidence recommendation, an unusually large suggested change, or a product where you have outside context the model can't see (a known upcoming promotion, a supplier issue, a seasonal quirk) is worth a quick individual look before applying. The point isn't to review everything by hand, it's to concentrate your limited attention on the subset that actually benefits from it.</p>

<h2>Why Per-Product Independence Matters During a Bulk Apply</h2>
<p>When applying changes across many SKUs at once, a single product hitting an issue, a sync failure, a flagged inconsistency, shouldn't block the rest of the catalog from updating. A well-built bulk apply flow handles each product independently, applying the ones that succeed and clearly reporting which ones didn't, rather than an all-or-nothing operation that stalls the entire batch over one problem product.</p>

<h2>A Practical Way to Roll This Out</h2>
<ol>
  <li><strong>Start with a subset</strong>, ten to twenty products in a category you know well, and review those individually first.</li>
  <li><strong>Compare the recommendations against outcomes</strong> you'd expect, building trust in the pattern before scaling up.</li>
  <li><strong>Bulk apply high-confidence recommendations</strong> across the rest of the catalog once you trust the pattern.</li>
  <li><strong>Reserve individual review</strong> for low-confidence products, unusually large changes, or SKUs with context the model wouldn't know about.</li>
  <li><strong>Repeat on your normal review cadence</strong>, not as a one-time catalog cleanup.</li>
</ol>
<p>If your catalog has grown past what you can reasonably review product by product, <a href="/signup">connect your sales history</a> and see the full-catalog recommendation view rather than opening each product one at a time.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How do I set prices for my whole catalog without doing it one by one?</h3>
<p>Let each product's own elasticity model generate a recommendation automatically, then bulk apply the high-confidence ones and individually review only those flagged with lower confidence or unusually large changes.</p>
</div>
<div class="faq-item">
<h3>Is it safe to bulk apply price changes across many products at once?</h3>
<p>For high-confidence recommendations backed by substantial sales history, yes. Lower-confidence or unusually large changes are worth a quick individual look first.</p>
</div>
<div class="faq-item">
<h3>What happens if one product fails during a bulk price update?</h3>
<p>A well-built bulk apply process handles each product independently, so a single failure doesn't block the rest of the catalog from updating successfully.</p>
</div>
<div class="faq-item">
<h3>Should I review every recommendation individually the first time?</h3>
<p>Starting with a smaller subset and comparing recommendations against expected outcomes is a reasonable way to build trust before applying changes across your full catalog.</p>
</div>
<div class="faq-item">
<h3>Does bulk applying mean I skip review entirely?</h3>
<p>No. The goal is concentrating your limited review time on products that genuinely need it, not eliminating review for the whole catalog.</p>
</div>
<div class="faq-item">
<h3>How often should I run a catalog-wide pricing review?</h3>
<p>On a regular cadence, commonly monthly for a small catalog, rather than as a one-time cleanup, since costs and demand continue shifting over time.</p>
</div>
<div class="faq-item">
<h3>What size catalog actually needs this instead of manual review?</h3>
<p>Once a catalog grows past what you can reasonably review in an afternoon, commonly a few dozen SKUs or more, manual one-by-one review stops being a practical option for a lean team.</p>
</div>
</section>

<p class="conclusion">Pricing a whole catalog doesn't have to mean reviewing every product by hand. Let the data sort high-confidence recommendations from the ones that need a closer look, and your limited review time goes to the products that actually benefit from it.</p>
    `.trim(),
  },
  {
    slug: "how-much-should-i-trust-an-ai-pricing-recommendation",
    title: "How Much Should I Trust an AI Pricing Recommendation?",
    excerpt:
      "Blind trust and blind rejection are both wrong. Here's how to actually evaluate an AI price recommendation before you act on it.",
    date: "2026-07-29",
    readingTime: "8 min read",
    category: "Education",
    content: `
<p class="intro">You should trust an AI pricing recommendation exactly as much as its confidence score and stated reasoning support, no more and no less. A recommendation backed by strong data and a clear explanation deserves real weight. One with thin data and a vague justification deserves a test, not blind acceptance. The mistake most merchants make isn't trusting AI too much or too little in general, it's treating every recommendation with the same level of trust regardless of what's actually behind it.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Trust should scale with the confidence score and data behind a recommendation, not be applied uniformly to every output.</li>
<li>Explainability matters: a recommendation with a stated reason is more trustworthy than a bare number, because you can sanity-check the logic yourself.</li>
<li>Consumer research on AI trust consistently shows explainability outranks raw model sophistication as a trust factor.</li>
<li>A what-if simulator and a review-before-apply step let you verify a recommendation before committing, rather than trusting or rejecting it blind.</li>
<li>Guardrails (a hard margin ceiling on how far a price can move, review before bulk apply) matter more than how advanced the underlying model is.</li>
</ul>
</div>

<h2>The Real Question Isn't "AI or Not," It's "How Much Evidence Is Behind This Call"</h2>
<p>Framing this as a binary, trust AI or don't, misses what actually determines whether a recommendation is reliable. Two recommendations from the exact same model can deserve very different levels of trust if one is backed by a thousand data points across multiple price points and the other by a handful of sales at a single price that's never moved. The model isn't the variable that matters most. The evidence behind the specific recommendation is.</p>

<h2>What "Explainable" Actually Looks Like</h2>
<p>Research on AI trust in commercial contexts consistently finds that explainability outranks raw sophistication as a trust factor. People don't just want a recommendation, they want to know why it's being made. A bare instruction like "change this price to $24.99" gives you nothing to evaluate. A recommendation that states "your elasticity is -1.2, raising to $85 is projected to lift profit 14%, based on 1,247 data points with a strong model fit" gives you something you can actually check against your own knowledge of the product and its customers.</p>
<p><strong>This is the difference between a black box and a reasoning partner.</strong> One asks for faith. The other shows its work, so you're evaluating the logic, not just accepting a conclusion.</p>

<h2>Confidence Scores Exist Specifically So You Don't Trust Uniformly</h2>
<p>A model health indicator (commonly labeled something like Strong, Fair, or Weak fit, alongside an R-squared value) tells you directly how much statistical support exists behind a given recommendation. A Strong-fit recommendation on a bestseller with months of price history deserves real weight. A Weak-fit recommendation on a product that's only ever had one price is closer to an educated hypothesis than a settled answer, and should be treated that way, tested rather than applied outright.</p>
<table>
  <thead>
    <tr><th>Confidence level</th><th>What it means</th><th>How much to trust it</th></tr>
  </thead>
  <tbody>
    <tr><td>Strong</td><td>High R-squared, substantial data points, real price variation in history</td><td>Reasonable to apply directly, especially for lower-risk changes</td></tr>
    <tr><td>Fair</td><td>Moderate fit, some data, limited price variation</td><td>Worth testing with a what-if simulator before applying</td></tr>
    <tr><td>Weak</td><td>Model exists but data is thin or has never varied in price</td><td>Treat as a starting hypothesis; gather more data before trusting fully</td></tr>
  </tbody>
</table>

<h2>Where Real Skepticism Is Warranted</h2>
<p>There's a real, ongoing conversation among regulators and researchers about algorithmic pricing more broadly, particularly around opaque systems that adjust prices in real time without clear limits or explanation. That skepticism is healthy and mostly applies to a different kind of system: fully automated repricers with no review step and no stated reasoning. A recommendation you review, understand, and choose to apply yourself is a fundamentally different risk profile than a black-box system silently changing prices on its own.</p>
<p><strong>The practical guardrails worth insisting on from any pricing tool:</strong> a review-before-apply step, a stated reason for every recommendation, and a way to test a change before committing to it. Those three things do more for trustworthiness than any claim about how advanced the underlying model is.</p>

<h2>How Zorin Is Built Around This</h2>
<p>Every recommendation ships with the elasticity number, the R-squared fit, a confidence label, and the estimated profit lift, not a bare instruction. Nothing applies automatically. You review each raise, lower, or hold call and apply it yourself, one product at a time or in bulk, and a what-if simulator lets you preview a candidate price against your own demand curve before you commit to anything. The goal isn't to ask for blind trust. It's to make the reasoning visible enough that you can decide, case by case, how much a given recommendation deserves.</p>

<h2>A Practical Test You Can Run Yourself</h2>
<p>Pick one product with a Strong confidence score and one with a Weak one. Apply the Strong recommendation and watch the actual outcome against the projected lift. Test the Weak recommendation with the simulator first rather than applying it directly, and let more sales history accumulate before trusting it fully. This single comparison teaches you more about how much to trust the system than any general rule would. If you're ready to see your own numbers, <a href="/signup">connect your sales history</a> and start with a handful of products before trusting it with your whole catalog.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How much should I trust an AI pricing recommendation?</h3>
<p>Trust it in proportion to its confidence score and the reasoning behind it. A strong-fit recommendation with a clear explanation deserves real weight; a weak-fit one deserves testing first.</p>
</div>
<div class="faq-item">
<h3>What makes a pricing recommendation trustworthy?</h3>
<p>A stated reason (the elasticity number and projected impact), a confidence level based on how much data supports it, and the ability to test it before applying it.</p>
</div>
<div class="faq-item">
<h3>Should I ever apply a recommendation without checking it?</h3>
<p>For a Strong-confidence recommendation on a low-risk change, applying directly is reasonable. For anything with thin data or a Weak fit, test it with a simulator first.</p>
</div>
<div class="faq-item">
<h3>Is fully automated pricing risky?</h3>
<p>Fully automated systems that change prices in real time with no review step and no stated reasoning carry more real risk, both for trust and for regulatory scrutiny, than a system where you review and apply each recommendation yourself.</p>
</div>
<div class="faq-item">
<h3>Why does explainability matter more than model sophistication?</h3>
<p>A stated reason lets you sanity-check a recommendation against your own knowledge of the product. A bare number asks you to trust the system blindly, regardless of how advanced it actually is.</p>
</div>
<div class="faq-item">
<h3>What's a confidence score based on?</h3>
<p>Typically the statistical fit of the underlying model (such as an R-squared value) and how much real price variation and data volume support the estimate.</p>
</div>
<div class="faq-item">
<h3>Can I test a recommendation before committing to it?</h3>
<p>Yes. A what-if simulator lets you preview the projected impact of a candidate price against your own demand curve before applying anything.</p>
</div>
</section>

<p class="conclusion">The right amount of trust in an AI pricing recommendation isn't a fixed number, it's a function of the evidence behind that specific call. Look for a stated reason, a confidence score, and a chance to test before you apply, and you'll trust the right recommendations the right amount, not too much and not too little.</p>
    `.trim(),
  },
  {
    slug: "what-does-price-elasticity-actually-mean",
    title: "What Does Price Elasticity Actually Mean?",
    excerpt:
      "It sounds like economics-class jargon that doesn't apply to a small store. It's actually the simplest, most useful number in your sales data.",
    date: "2026-07-29",
    readingTime: "7 min read",
    category: "Education",
    content: `
<p class="intro">Price elasticity is just a number describing how much your sales volume changes when your price changes, calculated directly from your own sales history. A lot of merchants assume it's academic jargon that only applies to economists or huge retailers with data teams. In reality, it's one of the simplest, most directly useful numbers a small store can calculate, and you likely already have the raw data sitting in your order history.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Elasticity measures how much demand shifts when price shifts, calculated from your own historical sales at different prices.</li>
<li>Low elasticity (closer to 0) means customers barely notice a price change; high elasticity means they're very sensitive to it.</li>
<li>The number, not intuition, tells you whether raising or lowering a specific product's price will increase total profit.</li>
<li>You don't need an economics background to use it. A model can calculate it automatically from uploaded sales history.</li>
<li>Promotional periods distort the calculation unless they're identified and excluded first.</li>
</ul>
</div>

<h2>The Myth: Elasticity Is an Academic Concept for Big Retailers</h2>
<p>It's easy to assume elasticity belongs in an economics textbook, not a small Shopify store's dashboard. That assumption comes from how it's usually taught, as an abstract curve with theoretical demand functions, rather than from what it actually requires: your own price and quantity history, nothing more exotic than that. Any store with some price variation in its sales history has what's needed to calculate it.</p>

<h2>What the Number Actually Means</h2>
<p>Elasticity is expressed as a single figure, typically negative, describing the percentage change in quantity sold for a percentage change in price. If 100 customers bought a product at $49 and only 55 bought it after you raised the price to $59, that gap is a direct, measurable read on how price-sensitive your buyers are for that specific product.</p>
<table>
  <thead>
    <tr><th>Elasticity value</th><th>What it means</th><th>What it suggests</th></tr>
  </thead>
  <tbody>
    <tr><td>-0.4 (inelastic)</td><td>Demand barely moves when price moves</td><td>Raising price likely increases total profit</td></tr>
    <tr><td>-1.0 (unit elastic)</td><td>Demand changes proportionally to price</td><td>Revenue stays roughly flat either direction</td></tr>
    <tr><td>-1.8 (elastic)</td><td>Demand is very sensitive to price</td><td>Raising price risks losing more in volume than it gains in margin</td></tr>
  </tbody>
</table>

<h2>Why This Beats Gut Feel or Copying a Competitor</h2>
<p>Gut feel tells you nothing about whether $79 or $89 makes more money, because there's no data behind the instinct either way. Copying a competitor's price assumes your customers behave identically to theirs, which is rarely true since they arrived through different channels with different expectations. Elasticity is the only one of the three that's actually grounded in how your specific customers respond, because it's calculated from their actual past behavior, not a guess about it.</p>

<h2>How the Calculation Actually Works</h2>
<p>The underlying method is a log-log regression across your historical price and quantity data, which fits a line describing the relationship between the two on a percentage basis. You don't need to run this by hand. A model does the regression automatically from an uploaded sales history or a live Shopify or WooCommerce sync, and returns the elasticity coefficient alongside an R-squared score, which tells you how well the model actually fits your data, not just what the number is.</p>

<h2>One Distortion Worth Knowing About: Promotions</h2>
<p>Not every data point in your history is a clean read on normal buying behavior. A discount period shows a lot of units sold at an artificially low price, and that spike reflects the promotion, not how customers respond to your regular pricing. Left uncorrected, it pulls the whole elasticity estimate in the wrong direction. A well-built model automatically flags statistical outliers, most commonly promotional spikes, and excludes them so the baseline number reflects ordinary demand.</p>

<h2>Why the Confidence Behind the Number Matters as Much as the Number</h2>
<p>A product with one price its entire life gives almost no signal to calculate elasticity from. A product that's moved through several price points across meaningful sales history gives a real, trustworthy estimate. This is why elasticity should always come with a confidence indicator (Strong, Fair, Weak), so a data-thin estimate doesn't get treated with the same certainty as a well-supported one.</p>

<h2>Putting the Number to Work</h2>
<p>Once you have an elasticity estimate for a product, the profit-maximizing price follows directly from it, and a what-if simulator lets you preview the projected impact of specific candidate prices before you touch a live listing. If you want to see your own catalog's elasticity rather than a textbook example, <a href="/signup">upload your sales history</a> and the calculation runs automatically.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>What does price elasticity actually mean?</h3>
<p>It's a measure of how much your sales volume changes when your price changes, calculated from your own historical sales at different price points.</p>
</div>
<div class="faq-item">
<h3>Do I need an economics background to use elasticity?</h3>
<p>No. A model can calculate it automatically from your sales history and return a plain recommendation, not a raw statistical output you need to interpret yourself.</p>
</div>
<div class="faq-item">
<h3>What's the difference between elastic and inelastic demand?</h3>
<p>Inelastic demand means customers barely change their buying behavior when price moves. Elastic demand means they're very sensitive, and a price increase risks losing more in volume than it gains in margin.</p>
</div>
<div class="faq-item">
<h3>How is elasticity actually calculated?</h3>
<p>Typically through a log-log regression across historical price and quantity data, which produces a coefficient describing the percentage relationship between the two.</p>
</div>
<div class="faq-item">
<h3>Can promotions distort an elasticity estimate?</h3>
<p>Yes. A discount period inflates apparent demand at an artificially low price, which skews the estimate unless that period is identified and excluded from the calculation.</p>
</div>
<div class="faq-item">
<h3>How much sales data do I need to calculate elasticity reliably?</h3>
<p>More price variation and more data points produce a more reliable estimate. A confidence indicator tells you how much to trust a given product's number rather than assuming they're all equally certain.</p>
</div>
<div class="faq-item">
<h3>Is elasticity only useful for large retailers?</h3>
<p>No. Any store with some price history and variation has the raw material needed to calculate it, regardless of size.</p>
</div>
</section>

<p class="conclusion">Elasticity isn't an abstract economics concept sitting outside the reach of a small store. It's a direct read on your own customers' behavior, calculated from data you're already generating with every sale. Once you know it, guessing what to charge stops being necessary.</p>
    `.trim(),
  },
  {
    slug: "how-do-i-price-a-new-product-with-no-sales-history",
    title: "How Do I Price a New Product With No Sales History?",
    excerpt:
      "You can't calculate elasticity from data that doesn't exist yet. Here's what to actually do until it does.",
    date: "2026-07-29",
    readingTime: "7 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Without sales history, you can't yet calculate elasticity, so a new product's launch price should be set with value-based reasoning and a deliberate cost-plus floor, then corrected quickly once real sales data starts to accumulate. The honest answer is that a launch price is always a hypothesis, not a settled number, and the goal is getting to real data as fast as possible, not perfecting a guess.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>A launch price without sales history is a starting hypothesis, not a final answer. There's no way to calculate elasticity before real data exists.</li>
<li>Research suggests most new products are mispriced too low, not too high, often because underpricing feels safer at launch.</li>
<li>Start from a cost-plus floor for safety, then anchor toward value-based reasoning about what the product is actually worth to the customer.</li>
<li>Deliberate initial price variation (even small, planned tests) is what generates the data you'll need to calculate real elasticity soon after launch.</li>
<li>Treat the first weeks of sales as the data-gathering phase, and revisit the price with real elasticity as soon as there's enough history to calculate it.</li>
</ul>
</div>

<h2>Why This Is a Genuinely Different Problem From Repricing an Existing Product</h2>
<p>Everything about pricing an established product starts from a demand signal: past sales at past prices. A brand-new product has none of that. There's no elasticity to calculate yet, no confidence score to lean on, nothing but a hypothesis about what customers will pay. That's not a flaw in the process, it's just the honest starting condition every new product launches from.</p>

<h2>The Most Common Mistake: Underpricing to Feel Safe</h2>
<p>Research on new-product pricing consistently finds that the majority of mispriced launches are priced too low, not too high. Underpricing feels safer in the moment, since a lower number seems less likely to scare off a first customer. The problem is that underpricing without a deliberate plan to raise the price later trains customers to expect the low number, and by the time you try to correct it, the product has already built a customer base anchored to a price it never should have kept.</p>
<p><strong>The distinction that matters:</strong> a lower launch price used deliberately, with a planned path to test higher prices soon after, is a legitimate strategy. A lower launch price chosen simply because it feels less risky, with no plan to move it, usually locks in a margin problem.</p>

<h2>Two Starting Points Worth Combining</h2>
<h3>Value-based reasoning</h3>
<p>Anchor your starting price in what the customer believes the product is worth, not just what it cost you to make. This requires actually thinking through the comparison the customer will make in their head, what alternative are they weighing this against, and what makes this specific product worth more or less than that alternative.</p>
<h3>A cost-plus floor as a safety net</h3>
<p>Regardless of the value story, calculate your true landed cost, including fees and fulfillment, and treat the resulting minimum margin as a floor no launch price should cross. This doesn't replace value-based thinking, it just prevents a value estimate from accidentally pricing you into a loss.</p>

<h2>Competitive Benchmarking Has a Role, But a Limited One</h2>
<p>Looking at comparable products can tell you the rough range customers already expect for something like yours. It's a reasonable starting anchor, especially with zero reviews or track record of your own yet. It's not a substitute for eventually reading your own customers' actual behavior, and pricing meaningfully below a comparable product's price risks starting a race to the bottom rather than establishing a fair starting point.</p>

<h2>Deliberately Generating the Data You'll Need</h2>
<p>The fastest way out of "no sales history" is a small, planned price test rather than picking one number and leaving it untouched indefinitely. Testing two or three price points early, even briefly, gives you the price-and-quantity variation elasticity actually needs to be calculated. Sitting at one unchanged price for months produces the exact blind spot: no variation means no signal, regardless of how much volume moves.</p>

<h2>What Changes Once Real Data Exists</h2>
<p>As soon as there's enough sales history with some price variation, an elasticity model can be fit for the product just like any established item in your catalog, with a confidence score reflecting how thin that early data still is. Early on, expect a Weak or Fair confidence label rather than Strong, and treat the resulting recommendation as directional rather than final until more history accumulates.</p>
<table>
  <thead>
    <tr><th>Stage</th><th>What you have</th><th>What to do</th></tr>
  </thead>
  <tbody>
    <tr><td>Pre-launch</td><td>No sales data, no elasticity</td><td>Value-based estimate, cost-plus floor, light competitive benchmarking</td></tr>
    <tr><td>First few weeks</td><td>Limited data, likely no price variation yet</td><td>Test a second price point deliberately to generate real signal</td></tr>
    <tr><td>After enough variation</td><td>Early elasticity estimate, Weak or Fair confidence</td><td>Treat as directional; revisit as more data accumulates</td></tr>
    <tr><td>Established history</td><td>Strong-confidence elasticity estimate</td><td>Trust the recommendation with normal confidence, same as any mature product</td></tr>
  </tbody>
</table>

<h2>A Practical Sequence for a New Product</h2>
<ol>
  <li><strong>Set a cost-plus floor</strong> first, so no launch price can accidentally sell at a loss.</li>
  <li><strong>Anchor a value-based starting price</strong> above that floor, reasoning through what the customer is comparing it against.</li>
  <li><strong>Avoid underpricing purely to feel safe</strong> without a deliberate plan to test higher soon after.</li>
  <li><strong>Test a second price point</strong> within the first few weeks to generate real variation.</li>
  <li><strong>Let a confidence-scored elasticity estimate take over</strong> once there's enough history, and stop relying on the initial guess.</li>
</ol>
<p>Once you have even a few weeks of sales at more than one price, <a href="/signup">upload that history</a> and see what the earliest elasticity read looks like, flagged with an honest confidence level rather than false certainty.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How do I price a new product with no sales history?</h3>
<p>Start with a cost-plus floor for safety, anchor a value-based starting price above it, and plan to test a second price point soon after launch to generate the data needed for a real elasticity estimate.</p>
</div>
<div class="faq-item">
<h3>Is it safer to underprice a new product at launch?</h3>
<p>Not necessarily. Most mispriced new products are priced too low, and underpricing without a deliberate plan to raise the price later often locks in a lower margin permanently.</p>
</div>
<div class="faq-item">
<h3>Should I just match a competitor's price for a new product?</h3>
<p>Competitive benchmarking is a reasonable starting anchor with no track record of your own, but it shouldn't replace eventually pricing from your own customers' actual behavior.</p>
</div>
<div class="faq-item">
<h3>How soon can I calculate real elasticity for a new product?</h3>
<p>As soon as there's some sales history with real price variation, even a few weeks' worth, though the confidence level will start Weak or Fair until more data accumulates.</p>
</div>
<div class="faq-item">
<h3>Should I test multiple prices right after launch?</h3>
<p>Yes, deliberately. A single unchanged price produces no variation to learn from, while testing a second price point early generates the signal elasticity actually needs.</p>
</div>
<div class="faq-item">
<h3>What's the biggest risk with a new product's launch price?</h3>
<p>Picking a price by instinct and never revisiting it once real sales data exists, which turns a reasonable starting hypothesis into a permanent, unexamined mistake.</p>
</div>
<div class="faq-item">
<h3>How do I know when to stop trusting my initial guess?</h3>
<p>As soon as a confidence-scored elasticity estimate exists for the product, that number should carry more weight than the original launch-day reasoning.</p>
</div>
</section>

<p class="conclusion">A new product's price is always a hypothesis at launch, not a final answer. Set it deliberately, avoid underpricing purely out of caution, and move quickly toward real sales data so the hypothesis can be replaced by an actual, measurable read on what your customers will pay.</p>
    `.trim(),
  },
  {
    slug: "why-did-my-sales-drop-when-i-raised-my-price",
    title: "Why Did My Sales Drop When I Raised My Price?",
    excerpt:
      "A volume drop after a price increase isn't automatically a mistake. Here's how to tell the difference from an actual problem.",
    date: "2026-07-29",
    readingTime: "8 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Sales dropping after a price increase isn't automatically a sign the increase was wrong, it's often exactly what elasticity predicts, and the real question is whether the resulting profit went up or down, not whether unit volume did. A price increase that costs you 10% of your sales volume while raising your margin 20% usually leaves you more profitable overall, even though the drop in units feels like a bad outcome in the moment.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>Some volume drop after a price increase is expected and doesn't necessarily mean profit fell, check total profit, not just units sold.</li>
<li>How the increase was communicated and its size relative to your customers' usual expectations both affect how much volume actually drops.</li>
<li>A history of discounting before the increase can make customers more resistant to the new, higher price than a comparable store without that history.</li>
<li>Elasticity, calculated from your own sales data, predicts roughly how much volume drop to expect for a given price increase, so you can tell an expected result from a genuine problem.</li>
<li>Changing multiple things at once (price, packaging, marketing) makes it hard to isolate what actually caused a sales change.</li>
</ul>
</div>

<h2>The First Question: Did Profit Actually Fall, or Just Volume?</h2>
<p>Revenue and unit volume are not the same signal as profit. If a price increase causes fewer units to sell but each unit now carries meaningfully more margin, total profit can rise even while the sales count on your dashboard looks worse. Before treating a volume drop as evidence the increase was a mistake, calculate what happened to total profit specifically, not just the more visible unit count.</p>

<h2>Some Drop Is Expected, and Elasticity Tells You Roughly How Much</h2>
<p>If your product's elasticity is -1.2, a 10% price increase predicting roughly a 12% drop in units isn't a surprise, it's the model working as expected. The real red flag isn't a drop matching what elasticity predicted. It's a drop meaningfully larger than what the number suggested should happen, which points to something else going on beyond ordinary price sensitivity.</p>

<h2>Reasons the Drop Might Be Larger Than Expected</h2>

<h3>The size and framing of the increase</h3>
<p>A sudden, large jump (30% or more) can shock a customer base accustomed to a stable lower price in a way a smaller, more gradual increase wouldn't. How the change is communicated matters too. Explicitly warning customers a price increase is coming, without a clear reason attached, can itself suppress demand independent of the new price.</p>

<h3>A history of prior discounting</h3>
<p>If customers were previously trained to expect frequent discounts, raising the regular price can trigger more resistance than it would for a store with a stable pricing history. Discounting can lower perceived value in a customer's mind, making it harder to justify a higher price later, even if the higher price is entirely fair for the product.</p>

<h3>Changing more than one thing at once</h3>
<p>If the price change happened alongside a marketing shift, a packaging change, or a different acquisition channel mix, isolating the price as the actual cause becomes difficult. A drop that looks like a pricing problem might actually be a marketing or channel problem wearing a pricing costume.</p>

<table>
  <thead>
    <tr><th>Observed drop vs. elasticity prediction</th><th>Likely explanation</th></tr>
  </thead>
  <tbody>
    <tr><td>Roughly matches the predicted drop</td><td>Normal price sensitivity; check total profit before assuming it's a problem</td></tr>
    <tr><td>Meaningfully larger than predicted</td><td>Something else at play: framing, discount history, or a confounding change made at the same time</td></tr>
    <tr><td>Smaller than predicted</td><td>Demand may be less elastic than the model estimated, or a confidence-thin estimate needs more data</td></tr>
  </tbody>
</table>

<h2>How to Actually Check This on Your Own Store</h2>
<p>Compare your product's actual elasticity, calculated from its own price and quantity history, against the drop you observed after the increase. If the observed drop tracks closely with what the elasticity number predicted, the increase is behaving exactly as expected, and the profit outcome, not the volume outcome, is what determines whether it was the right call. If the drop is meaningfully larger, look for a confounding factor (framing, discount history, a simultaneous change elsewhere) before concluding the price itself was wrong.</p>

<h2>What to Do Next</h2>
<p>If profit rose despite the volume drop, the increase likely worked as intended, and reverting would give back real margin for no clear reason. If profit fell and the drop outpaced what elasticity predicted, consider whether the increase was framed poorly, came too soon after heavy discounting, or coincided with an unrelated change worth untangling before adjusting the price again. Either way, the decision should follow what the data shows happened, not just how the volume number felt in the moment.</p>
<p>If you haven't calculated your own product's elasticity yet to make this comparison, <a href="/blog/how-do-i-know-what-to-price-my-products">here's how</a>, and if you want to check whether other products in your catalog have a similar gap between expected and actual performance, <a href="/signup">connect your sales history</a> and review the full picture.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>Why did my sales drop when I raised my price?</h3>
<p>Some drop is expected and predicted by your product's elasticity. Check whether total profit rose or fell, not just whether unit volume dropped, before concluding the increase was a mistake.</p>
</div>
<div class="faq-item">
<h3>Is a sales drop after a price increase always bad?</h3>
<p>No. If the resulting margin increase more than offsets the lost volume, total profit can rise even though the unit count looks worse.</p>
</div>
<div class="faq-item">
<h3>How much of a drop should I expect from a price increase?</h3>
<p>Roughly what your product's elasticity predicts. A 10% price increase on a product with -1.2 elasticity predicts around a 12% drop in units, for example.</p>
</div>
<div class="faq-item">
<h3>What if the drop is bigger than elasticity predicted?</h3>
<p>Look for a confounding factor: how the increase was framed to customers, a history of prior discounting that trained lower price expectations, or another change made around the same time.</p>
</div>
<div class="faq-item">
<h3>Does prior discounting make future price increases harder?</h3>
<p>Often, yes. Frequent past discounts can lower perceived value and anchor customers to a lower price, making a later increase feel like a bigger jump than the same increase would for a store without that history.</p>
</div>
<div class="faq-item">
<h3>Should I revert a price increase if sales drop?</h3>
<p>Only if total profit also fell and the drop can't be explained by expected elasticity. If profit rose despite fewer units, reverting usually gives back real margin unnecessarily.</p>
</div>
<div class="faq-item">
<h3>How do I isolate the price as the actual cause of a sales change?</h3>
<p>Avoid changing marketing, packaging, or channel mix at the same time as a price change, so any resulting shift in sales can be attributed to the price with more confidence.</p>
</div>
</section>

<p class="conclusion">A drop in sales after a price increase is data, not automatically a verdict. Compare it against what your product's own elasticity predicted, check total profit rather than unit count, and only treat it as a real problem if the numbers actually say so.</p>
    `.trim(),
  },
  {
    slug: "how-often-should-i-change-my-prices",
    title: "How Often Should I Change My Prices?",
    excerpt:
      "Not every week, and not never. Here's how to find the right cadence for your catalog instead of guessing.",
    date: "2026-07-29",
    readingTime: "7 min read",
    category: "Pricing Strategy",
    content: `
<p class="intro">Most small catalogs are well served by reviewing pricing on a regular cadence, commonly monthly, rather than reacting to every minor fluctuation or leaving prices untouched for months at a time. The right frequency depends more on how fast your costs and demand actually shift than on a fixed rule, but the two failure modes to avoid are the same for almost everyone: changing too often to react to noise, or changing so rarely that a price quietly drifts out of alignment with reality.</p>

<div class="key-takeaways">
<p class="kt-label">Key Takeaways</p>
<ul>
<li>A regular review cadence (commonly monthly for small catalogs) beats both constant reactive changes and leaving prices untouched indefinitely.</li>
<li>Reacting to every minor competitor or demand fluctuation adds noise without adding real signal, since short-term swings often reverse on their own.</li>
<li>Costs, product mix, and channel mix all shift over time, and a price that was correct when set can quietly become wrong without anything obviously breaking.</li>
<li>A confidence score tells you which products can handle a longer review interval and which need closer attention due to thin data.</li>
<li>Certain triggers (a cost change, a new competitor, a big swing in sales) warrant an off-cycle review regardless of your regular schedule.</li>
</ul>
</div>

<h2>Two Failure Modes, Not One</h2>
<p>Merchants tend to worry about only one direction: not changing prices often enough. The opposite mistake is just as real. Reacting to every small fluctuation, a competitor's temporary discount, a single slow week, treats noise as signal and can lead to price changes that don't reflect any real underlying shift in demand. The goal isn't maximum frequency, it's the right frequency for what's actually changing underneath.</p>

<h2>Why a Fixed Cadence Beats Ad Hoc Reactions</h2>
<p>A regular review, commonly monthly for a small catalog, forces a deliberate look at whether each price still reflects current elasticity and cost structure, rather than leaving that question to whenever something prompts you to think about it. Ad hoc reviews tend to happen only when something goes visibly wrong, which means the quiet, gradual drift, a price slowly falling out of alignment with actual demand, never gets caught until it's already cost meaningful profit.</p>

<h2>What Actually Changes Between Reviews</h2>
<ul>
  <li><strong>Costs:</strong> supplier pricing, shipping rates, and platform fees shift over time, changing your true landed cost and therefore your margin floor.</li>
  <li><strong>Customer mix:</strong> different acquisition channels can bring in buyers with different price sensitivity, shifting your effective elasticity even if nothing about the product changed.</li>
  <li><strong>Seasonality and demand patterns:</strong> a product's demand curve can genuinely differ across the year, not just its volume.</li>
</ul>
<p>None of these show up as an alert. They show up as a slowly widening gap between your price and what your own sales data would now recommend, which only a deliberate review catches.</p>

<h2>Let Confidence Scores Set the Pace Per Product</h2>
<p>Not every product needs the same review frequency. A Strong-confidence product with a well-established elasticity estimate can be reviewed on your normal cadence without much concern. A Weak-confidence product, one with thin data or limited price history, benefits from more frequent attention, since each new data point meaningfully improves the estimate's reliability.</p>
<table>
  <thead>
    <tr><th>Situation</th><th>Suggested review frequency</th></tr>
  </thead>
  <tbody>
    <tr><td>Established product, Strong confidence</td><td>Standard cadence (e.g. monthly) is usually sufficient</td></tr>
    <tr><td>New or thin-data product, Weak/Fair confidence</td><td>More frequent review as new sales data accumulates</td></tr>
    <tr><td>Recent cost change (supplier, fees, shipping)</td><td>Off-cycle review triggered immediately, not on the next scheduled date</td></tr>
    <tr><td>Post-promotion period</td><td>Review once the promo period is excluded from baseline data, not immediately during the post-sale dip</td></tr>
  </tbody>
</table>

<h2>Triggers Worth an Off-Cycle Review</h2>
<p>Regardless of your regular schedule, certain events are worth an immediate look rather than waiting for the next scheduled review: a real cost change (a supplier price increase, a new platform fee), a meaningful and sustained swing in sales that doesn't match a known promotion or seasonal pattern, or entering a new sales channel with its own distinct customer base.</p>

<h2>What This Looks Like in Practice</h2>
<p>Set a recurring monthly (or whatever cadence fits your catalog's pace of change) review across your full product list, using each product's confidence score to decide how much attention it needs that cycle. Layer in off-cycle checks whenever a real trigger occurs, rather than waiting for the scheduled date. This combination catches both the slow drift a fixed schedule alone would miss between cycles, and the noise a constantly-reactive approach would otherwise chase.</p>
<p>If you're not sure how out of date your current prices already are, <a href="/blog/is-your-store-leaving-money-on-the-table">here's how to check</a>, and once you've set your cadence, <a href="/signup">connect your sales history</a> so each review is based on a current, automatically updated elasticity estimate rather than a stale one.</p>

<section class="faq">
<h2>Frequently Asked Questions</h2>
<div class="faq-item">
<h3>How often should I change my prices?</h3>
<p>Most small catalogs are well served by a regular review, commonly monthly, rather than reacting to every fluctuation or leaving prices untouched for months.</p>
</div>
<div class="faq-item">
<h3>Is it bad to change prices too often?</h3>
<p>Yes, if the changes are reacting to short-term noise rather than a real underlying shift in cost or demand. Frequent reactive changes add confusion without adding real signal.</p>
</div>
<div class="faq-item">
<h3>What happens if I don't review prices often enough?</h3>
<p>Costs, customer mix, and demand patterns shift gradually, and a price that was correct when set can quietly drift out of alignment without any obvious sign that it happened.</p>
</div>
<div class="faq-item">
<h3>Should every product be reviewed on the same schedule?</h3>
<p>Not necessarily. Products with thin data or a Weak confidence score benefit from more frequent attention, while well-established, Strong-confidence products are fine on a standard cadence.</p>
</div>
<div class="faq-item">
<h3>What events should trigger an off-cycle price review?</h3>
<p>A real cost change, a meaningful and sustained swing in sales unrelated to a known promotion, or entering a new sales channel are all worth reviewing immediately rather than waiting for the next scheduled date.</p>
</div>
<div class="faq-item">
<h3>How do I know if my current review cadence is right?</h3>
<p>If you're regularly surprised by a margin gap you didn't catch sooner, your cadence is probably too infrequent. If you're constantly adjusting in response to minor swings, it's probably too frequent.</p>
</div>
<div class="faq-item">
<h3>Does seasonality affect how often I should review prices?</h3>
<p>Yes. Products with clear seasonal demand patterns may warrant a review timed around those shifts, in addition to your regular cadence.</p>
</div>
</section>

<p class="conclusion">The right pricing cadence isn't a universal number, it's whatever catches real drift in your costs and demand without chasing every short-term fluctuation. A regular review, adjusted by confidence score per product and layered with off-cycle checks for real triggers, does that better than either extreme.</p>
    `.trim(),
  },
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
