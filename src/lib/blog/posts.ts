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
    slug: "why-merchants-leave-money-on-the-table",
    title: "Why Merchants Leave Money on the Table With Flat Pricing",
    excerpt:
      "Most online stores set a price once and leave it. Here's why that habit is quietly draining your margins.",
    date: "2026-06-15",
    readingTime: "3 min read",
    category: "Pricing Strategy",
    content: `
<p>When you launched your store, you probably picked prices the same way most merchants do: looked at what competitors charge, added a margin on top of cost, and called it done. That price has likely not moved since.</p>

<p>The problem isn't that your initial price was wrong. The problem is that demand is not static. Customers who find your product through a Google ad convert differently than those who discover it on a deal site. Summer buyers behave differently than holiday shoppers. The price that maximized profit in January may be leaving significant money on the table in July.</p>

<h2>What flat pricing actually costs you</h2>

<p>Price elasticity (how much demand shifts when price changes) varies significantly by product category, customer segment, and season. For products with inelastic demand (where customers will buy regardless of small price increases), a 10% price raise often costs you less than 5% in volume. The net effect is a meaningful profit improvement with no additional marketing spend.</p>

<p>For elastic products, the math runs the other way: a small price cut can unlock a volume increase that more than compensates on total margin. Neither move is obvious without data.</p>

<h2>The fix is simpler than you think</h2>

<p>You already have the data to make better decisions. It's sitting in your order history. Sales volume at different price points, across different time periods, tells you exactly how your customers respond to price changes. The challenge is extracting the signal from the noise. That's what Zorin was built to do.</p>
    `.trim(),
  },
  {
    slug: "price-elasticity-101",
    title: "Price Elasticity 101: What Every Online Store Owner Should Know",
    excerpt:
      "Elasticity sounds like an economics lecture, but understanding one number can change how you price everything.",
    date: "2026-06-28",
    readingTime: "5 min read",
    category: "Education",
    content: `
<p>Price elasticity of demand measures how sensitive your customers are to price changes. It's expressed as a single number: if your elasticity is -1.5, a 10% price increase will reduce unit sales by roughly 15%. If it's -0.4, the same increase only costs you about 4% in volume.</p>

<h2>Elastic vs inelastic: why it matters</h2>

<p>An elasticity value between 0 and -1 means your product is inelastic: customers are relatively insensitive to price. Luxury goods, niche products with few substitutes, and essential items tend to fall here. You can often raise prices without losing much volume, and gain on total margin.</p>

<p>An elasticity below -1 (like -1.8 or -2.4) means your product is elastic: customers shop around and a price increase will cost you sales faster than it gains you revenue. For these products, competitive pricing or strategic discounting often wins.</p>

<h2>How to calculate it (without a spreadsheet)</h2>

<p>The classic formula is: elasticity = % change in quantity / % change in price. In practice, real-world data is noisy. Promotions, seasonality, and inventory constraints all muddy the signal. The more robust approach is log-log regression over your full sales history, which is exactly what Zorin's model fitting step runs. The output is a single elasticity coefficient per product, along with an R-squared score that tells you how much to trust it.</p>

<p>Once you know your elasticity, the profit-maximizing price follows from a formula. Zorin runs this automatically and tells you whether to raise, lower, or hold, and by how much.</p>
    `.trim(),
  },
  {
    slug: "from-csv-to-optimal-price",
    title: "From CSV to Profit-Optimized Prices in 5 Minutes",
    excerpt:
      "A quick walkthrough of how Zorin turns your sales history into actionable pricing recommendations.",
    date: "2026-07-05",
    readingTime: "2 min read",
    category: "Product",
    content: `
<p>Zorin is built around a simple idea: merchants already have the data they need to price better, they just don't have a way to use it. The flow from raw data to recommendation takes three steps.</p>

<h2>Step 1: Upload your sales history</h2>

<p>Export a CSV from your store with one row per sale: date, SKU, units sold, and price. Zorin parses the file, maps columns automatically, and loads the records into your product catalog. If you're on Shopify, the sync button handles this without any CSV at all.</p>

<h2>Step 2: Fit the demand model</h2>

<p>Click "Fit Model" on any product page. Zorin runs a log-log elasticity regression on your sales history, automatically flags promotional periods so they don't skew the model, and stores the coefficient. The whole process takes about a second. You get an elasticity value, an R-squared fit score, and a model health badge (Strong / Fair / Weak) so you know how much to trust the output.</p>

<h2>Step 3: Get your recommendation</h2>

<p>Click "Get Recommendation." Zorin finds the price point that maximizes profit given your elasticity, current price, and cost of goods. You see the suggested price, the expected profit lift, and a confidence score. If it looks right, click Apply. The price change is logged, and you can track the history over time.</p>

<p>That's it. No configuration, no data science, no integrations beyond an optional Shopify connection. Just your sales data and a price you can act on.</p>
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
