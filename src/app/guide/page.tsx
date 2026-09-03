import type { Metadata } from "next";
import Link from "next/link";
import { requireSessionPage } from "@/lib/auth/requireSession";

export const metadata: Metadata = {
  title: "In-App Guide — Zorin",
  description: "How to use Zorin: dashboard, elasticity, surveys, competitor prices, campaigns, and integrations.",
  robots: { index: false, follow: false },
};

const TOC = [
  { id: "what-is-zorin", label: "What is Zorin?" },
  { id: "getting-started", label: "Getting started" },
  { id: "your-dashboard", label: "Your dashboard" },
  { id: "price-elasticity", label: "Price elasticity" },
  { id: "price-survey", label: "Price sensitivity survey" },
  { id: "competitor-prices", label: "Competitor prices" },
  { id: "campaigns", label: "Pricing campaigns" },
  { id: "profit-tracking", label: "Profit tracking" },
  { id: "integrations", label: "Integrations" },
  { id: "team-settings", label: "Team & settings" },
  { id: "faq", label: "Common questions" },
];

export default async function GuidePage() {
  await requireSessionPage();

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">

      <div className="flex gap-10">

        {/* Sticky TOC */}
        <aside className="hidden lg:block w-44 shrink-0">
          <div className="sticky top-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-2"
            >
              ← Back to Dashboard
            </Link>
            <Link
              href="/dashboard?walkthrough=1"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6"
            >
              ↻ Replay walkthrough
            </Link>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">On this page</p>
            <nav className="space-y-0.5">
              {TOC.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block text-sm text-muted hover:text-ink py-1 px-2 rounded transition-colors hover:bg-surface border-l-2 border-transparent hover:border-accent"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">

      <div className="mb-10">
        <h1 className="text-2xl font-bold text-ink mb-2">How Zorin works</h1>
        <p className="text-muted text-sm leading-relaxed">
          A quick guide to getting the most out of your pricing tool. Read this once and you will know exactly what to do.
        </p>
      </div>

      {/* What is Zorin */}
      <Section id="what-is-zorin" title="What is Zorin?">
        <p>
          Zorin is a pricing intelligence tool for online merchants. It reads your sales history,
          calculates how sensitive your customers are to price changes, and tells you which products
          to raise, lower, or hold - and by how much.
        </p>
        <p>
          Most merchants price by gut feel or by copying competitors. The problem is that your
          customers are not their customers, and your costs are not their costs. Zorin uses your
          own data to find the price that maximises your profit for each product individually.
        </p>
        <Callout>
          Every sale you have ever made is a data point. When more people bought at $49 than at
          $59, that gap tells Zorin exactly how price-sensitive your buyers are - and it uses
          that to recommend the price that makes you the most money.
        </Callout>
      </Section>

      {/* Getting started */}
      <Section id="getting-started" title="Getting started">
        <p>There are five steps. Each one builds on the last.</p>

        <StepBlock number={1} title="Add your products">
          <p className="text-muted leading-relaxed">
            Go to the <strong className="text-ink">Products</strong> tab on your dashboard and
            upload a CSV with your catalog. Or connect Shopify or WooCommerce in{" "}
            <strong className="text-ink">Settings</strong> to import automatically - products
            and orders come in with one click.
          </p>
          <Screenshot src="/images/guide/dashboard-products.png" alt="Dashboard Products tab showing catalog import and sales history upload" />
        </StepBlock>

        <StepBlock number={2} title="Upload sales history">
          <p className="text-muted leading-relaxed">
            On a product&apos;s page, use the <strong className="text-ink">Upload Sales History</strong>{" "}
            panel. Upload a CSV with one row per sale: SKU, date, units sold, and price. You need
            at least 10 data points at two or more different price points per product.
            Use <strong className="text-ink">Download sample CSV</strong> to get a correctly
            formatted template.
          </p>
          <Screenshot src="/images/guide/product-upload.png" alt="Product page with the Upload Sales History panel and Analyse Pricing card" />
        </StepBlock>

        <StepBlock number={3} title="Fit a model">
          <p className="text-muted leading-relaxed">
            Click into any product from the Products tab, then click{" "}
            <strong className="text-ink">Fit Model</strong>. Zorin runs a regression on your
            sales data to calculate the price elasticity for that product.
          </p>
          <Screenshot src="/images/guide/product-upload.png" alt="Product page with the Analyse Pricing card and Fit Model / Get Recommendation buttons" />
        </StepBlock>

        <StepBlock number={4} title="Get a recommendation">
          <p className="text-muted leading-relaxed">
            Once the model is fitted, click{" "}
            <strong className="text-ink">Get Recommendation</strong>. Zorin finds the price
            that maximises your profit and recommends raise, lower, or hold - with an expected
            profit lift percentage.
          </p>
          <Screenshot src="/images/guide/product-recommendation.png" alt="A RAISE recommendation with expected profit lift and model confidence" />
        </StepBlock>

        <StepBlock number={5} title="Apply the price">
          <p className="text-muted leading-relaxed">
            Click <strong className="text-ink">Apply recommendation</strong>. The price updates
            in Zorin and - if you are connected to Shopify or WooCommerce - pushes live to your
            store automatically. Your full price history is recorded on this page.
          </p>
          <Screenshot src="/images/guide/product-price-history.png" alt="Price change history showing an applied price change, with the promotion flags table below" />
        </StepBlock>
      </Section>

      {/* Dashboard */}
      <Section id="your-dashboard" title="Understanding your dashboard">
        <p>The Overview tab shows your whole catalog at a glance.</p>
        <Screenshot src="/images/guide/dashboard-overview.png" alt="Dashboard Overview tab with portfolio stats, model health, and the average price trend chart" />
        <dl className="mt-4 space-y-4">
          <Term term="Products">Total products in your catalog.</Term>
          <Term term="Actionable">
            Products with a raise or lower recommendation ready to apply. Zero means all products
            are on hold - usually because the model needs more price variation in the data.
          </Term>
          <Term term="Below margin floor">
            Products where your current margin is below 15%. Worth reviewing pricing or costs.
          </Term>
          <Term term="Avg profit lift">
            The average expected profit improvement across all products with recommendations.
          </Term>
          <Term term="Profit opportunity">
            Total additional profit per month you could capture by applying all recommendations.
            Appears once you have fitted models.
          </Term>
          <Term term="Model health">
            Shows how many products have Strong, Fair, Weak, or no model. Strong means R² ≥ 0.7
            with 30+ data points. More data = healthier models.
          </Term>
        </dl>
      </Section>

      {/* Elasticity */}
      <Section id="price-elasticity" title="What is price elasticity?">
        <p>
          Price elasticity measures how much your sales volume changes when you change your price.
          An elasticity of <strong>−1.2</strong> means a 10% price increase leads to a 12% drop
          in units sold.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ElasticityCard label="Inelastic (0 to −1)" description="Customers are not very price-sensitive. Raising price increases revenue even as volume falls slightly. Common for premium or necessity products." color="text-emerald-600" />
          <ElasticityCard label="Elastic (below −1)" description="Customers are very price-sensitive. Lowering price can drive significantly more volume. Common for commoditised products." color="text-blue-600" />
        </div>
        <p className="mt-4">
          Zorin factors in your cost of goods to find the price that maximises{" "}
          <em>profit</em>, not just revenue. A product can be inelastic and still benefit from
          a lower price if margins are thin.
        </p>
      </Section>

      {/* Price sensitivity survey */}
      <Section id="price-survey" title="Price sensitivity survey">
        <p>
          Elasticity modelling tells you how customers respond based on what they actually
          bought. A price sensitivity survey asks them directly. Both are useful, and Zorin
          keeps them separate - the survey never overwrites or blends into your raise / lower /
          hold recommendation, it is a second, independent signal you look at alongside it.
        </p>
        <p>
          Open any product page and find the <strong className="text-ink">Van Westendorp
          Analysis</strong> card. Click <strong className="text-ink">Create survey link</strong>{" "}
          to generate a shareable, no-login link, then send it however you already reach
          customers - email, an order confirmation page, social media. Each respondent answers
          four questions: at what price would this feel too cheap to trust, a bargain, starting
          to feel expensive, and too expensive to buy.
        </p>
        <Callout>
          The method is named after Dutch economist Peter van Westendorp, who developed it in
          1976. It is a standard, widely used pricing-research technique - Zorin automates the
          math, not the methodology.
        </Callout>
        <Screenshot src="/images/guide/product-survey.png" alt="Van Westendorp Analysis card showing the optimal price, acceptable range, and a confidence badge" />
        <dl className="mt-4 space-y-4">
          <Term term="Optimal price">
            The price where the fewest customers call it either too cheap or too expensive -
            the headline number.
          </Term>
          <Term term="Indifference point">
            Where opinion is most evenly split between &quot;good value&quot; and &quot;getting
            expensive&quot;.
          </Term>
          <Term term="Acceptable range">
            The band of prices customers are unlikely to reject outright in either direction.
            Usually the most actionable number of the four.
          </Term>
          <Term term="Confidence">
            Purely a function of response count: no confidence under 5 responses, low from 5–19,
            good at 20 or more. Results show immediately at every tier - low-confidence results
            are still shown, just labelled, rather than hidden until you have more data.
          </Term>
        </dl>
      </Section>

      {/* Competitor prices */}
      <Section id="competitor-prices" title="Competitor prices">
        <p>
          Elasticity modelling and the survey both look inward, at your own customers. The{" "}
          <strong className="text-ink">Competitor prices</strong> card on each product page looks
          outward - it lets you record what similar products sell for elsewhere, so you know where
          you sit in the market before you apply a change.
        </p>
        <p>
          Open a product page and find the Competitor prices card. Add a competitor name, their
          price, and optionally a link to the listing. Zorin tracks each entry over time. These
          prices also feed directly into <strong className="text-ink">Launch Planner</strong>,
          where a competitor-match mode uses them to suggest a market-aware starting price for
          products with no sales history yet.
        </p>
      </Section>

      {/* Pricing campaigns */}
      <Section id="campaigns" title="Pricing campaigns">
        <p>
          A recommendation only helps once it is actually applied - and applying changes one
          product at a time does not scale past a handful of SKUs. <strong className="text-ink">
          Campaigns</strong> (in the sidebar, between Dashboard and Profit) let you roll a price
          change out across many products at once, on a schedule, using a rules engine instead of
          manual edits.
        </p>
        <div className="mt-4 space-y-4">
          <IntegrationCard
            name="Choose a mode"
            how="Percentage (flat % change across selected products), ML recommendation (applies Zorin's own raise/lower suggestion per product), or Competitor match (prices to the min or median of tracked competitor prices, plus or minus an offset)."
            where="Set in step 1 of the campaign builder, along with an optional margin floor so no product is ever priced below a safe profit line, and .99/.95 rounding."
          />
          <IntegrationCard
            name="Pick products and schedule"
            how="Filter by category, margin, or recommendation direction in step 2, then set a start and end date in step 3 - or use Execute Now to apply immediately."
            where="A preview shows the exact before/after price and percentage change for every selected product before anything goes live."
          />
        </div>
        <Callout>
          Campaigns auto-revert at the end date, back to each product&apos;s original price, and
          Zorin blocks two campaigns from claiming the same product at the same time. Track every
          run - draft, scheduled, active, or completed - from the Campaigns list, including a CSV
          export and a full timeline of what changed and when.
        </Callout>
      </Section>

      {/* Profit tracking */}
      <Section id="profit-tracking" title="Profit tracking">
        <p>
          A recommendation tells you what to change. <strong className="text-ink">Profit</strong>{" "}
          (in the sidebar, after Campaigns) tells you whether it worked - real profit and loss
          over time, not just the price itself.
        </p>
        <dl className="mt-4 space-y-4">
          <Term term="Summary cards">
            Gross profit and its month-over-month change, revenue, average margin, and cost of
            goods sold, at a glance.
          </Term>
          <Term term="Trend chart">
            Monthly revenue, cost of goods, and gross profit over the last 24 months, so you can
            see the shape of your margin over time, not just a single snapshot.
          </Term>
          <Term term="Product leaderboard">
            Toggle between top earners and margin bleeders, over a 30/90/365-day window, to find
            which products are quietly costing you money.
          </Term>
          <Term term="Campaign performance">
            For every completed campaign, profit during the campaign versus an equal-length prior
            period - labelled honestly when a campaign is still running, has no prior baseline to
            compare to, or falls back to an estimated cost of goods.
          </Term>
        </dl>
      </Section>

      {/* Integrations */}
      <Section id="integrations" title="Platform integrations">
        <p>
          Connect your store so products and orders import automatically and price changes go
          live without any extra steps.
        </p>
        <Screenshot src="/images/guide/settings-integrations.png" alt="Settings Integrations page with the Shopify and WooCommerce connection tiles" />
        <div className="mt-4 space-y-4">
          <IntegrationCard
            name="Shopify"
            how="Settings → Integrations, click the Shopify tile to open the connection drawer. Paste your store domain and an Admin API access token from a custom app."
            where="Shopify admin → Settings → Apps → Develop apps → Create an app → Configure Admin API scopes (read_products, read_orders, write_products)."
          />
          <IntegrationCard
            name="WooCommerce"
            how="Settings → Integrations, click the WooCommerce tile to open the connection drawer. Enter your store URL and a consumer key and secret."
            where="WordPress admin → WooCommerce → Settings → Advanced → REST API → Add key. Set permissions to Read/Write."
          />
        </div>
      </Section>

      {/* Team & settings */}
      <Section id="team-settings" title="Team & settings">
        <p>
          Settings is split into four pages under the Settings item in the sidebar:{" "}
          <strong className="text-ink">Account</strong> (your name and password),{" "}
          <strong className="text-ink">Billing</strong> (your plan and the option to
          upgrade or downgrade), <strong className="text-ink">Team</strong> (who has access), and{" "}
          <strong className="text-ink">Integrations</strong> (Shopify and WooCommerce).
        </p>
        <p>
          A Zorin account is no longer strictly one person. The account&apos;s{" "}
          <strong className="text-ink">Owner</strong> can invite teammates by email from
          Settings → Team - each invite is a link, valid for 7 days, that lets the invitee set
          their own password. <strong className="text-ink">Members</strong> get full access to
          products, pricing, campaigns, and profit data; only the Owner can manage billing and the
          team itself.
        </p>
        <Callout>
          The Team page is a filterable, sortable table: search by email, filter by status or
          role, and remove one or several members at once. A member can also leave a team
          themselves from their own Account page.
        </Callout>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="Common questions">
        <div className="space-y-5">
          <Faq q="How much sales data do I need?">
            At minimum 10 records at 2+ different price points per product. The model works best
            with 30+ records spanning a meaningful price range. If you have only sold at one
            price, try a small price test first.
          </Faq>
          <Faq q="Why is my model health Weak or Fair?">
            Weak means R² is low - the data does not show a clear price-volume relationship,
            often due to seasonality or promotions. Fair means R² is 0.5–0.7. Both are usable,
            treat recommendations as directional rather than precise.
          </Faq>
          <Faq q="What is a promotion flag?">
            Sales during promotions skew the elasticity calculation. Zorin can auto-detect
            promotional spikes and exclude them from the model. Use the flag-promotions option
            on any product page.
          </Faq>
          <Faq q="Can I undo a price change?">
            Not automatically for a single product - but you can apply any price at any time, and
            your full price history is on each product page. A campaign, on the other hand, does
            revert automatically at its end date back to the original price.
          </Faq>
          <Faq q="What's the difference between applying a recommendation and running a campaign?">
            Applying a recommendation changes one product&apos;s price immediately from its
            product page. A campaign changes many products at once, on a schedule, using a rule
            (percentage, ML recommendation, or competitor match) - useful once you are past
            reviewing products one at a time.
          </Faq>
          <Faq q="Can other people on my team use Zorin?">
            Yes. The account Owner can invite teammates from Settings → Team. Members get full
            access to products, pricing, campaigns, and profit tracking; only the Owner manages
            billing and the team itself.
          </Faq>
          <Faq q="Is my data safe?">
            Yes. Your data is stored in your own database and never shared. Store credentials
            are encrypted at rest with AES-256-GCM before being stored.
          </Faq>
        </div>
      </Section>

        </div>
      </div>
    </div>
  );
}

/* ── Layout helpers ── */

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <h2 className="text-base font-semibold text-ink mb-3 pb-2 border-b border-line">{title}</h2>
      <div className="space-y-3 text-sm text-ink leading-relaxed">{children}</div>
    </section>
  );
}

function StepBlock({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 flex gap-4">
      <span className="flex-none w-6 h-6 rounded-full bg-accent text-accent-fg text-xs font-semibold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <div className="flex-1 space-y-3">
        <p className="font-medium text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      width={1000}
      height={720}
      className="mt-3 w-full rounded-xl border border-line"
    />
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-accent/8 border border-accent/20 px-4 py-3 text-sm text-ink leading-relaxed">
      {children}
    </div>
  );
}

function Term({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-ink">{term}</dt>
      <dd className="text-muted mt-0.5">{children}</dd>
    </div>
  );
}

function ElasticityCard({ label, description, color }: { label: string; description: string; color: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className={`text-xs font-semibold mb-1.5 ${color}`}>{label}</p>
      <p className="text-xs text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function IntegrationCard({ name, how, where }: { name: string; how: string; where: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
      <p className="font-medium text-ink text-sm">{name}</p>
      <p className="text-xs text-muted leading-relaxed"><span className="text-ink font-medium">How to connect: </span>{how}</p>
      <p className="text-xs text-muted leading-relaxed"><span className="text-ink font-medium">Where to find credentials: </span>{where}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-ink mb-1">{q}</p>
      <p className="text-muted text-sm leading-relaxed">{children}</p>
    </div>
  );
}

