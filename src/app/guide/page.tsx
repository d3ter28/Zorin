import Link from "next/link";
import { requireSessionPage } from "@/lib/auth/requireSession";


const TOC = [
  { id: "what-is-zorin", label: "What is Zorin?" },
  { id: "getting-started", label: "Getting started" },
  { id: "your-dashboard", label: "Your dashboard" },
  { id: "price-elasticity", label: "Price elasticity" },
  { id: "integrations", label: "Integrations" },
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
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6"
            >
              ← Back to Dashboard
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
          to raise, lower, or hold — and by how much.
        </p>
        <p>
          Most merchants price by gut feel or by copying competitors. The problem is that your
          customers are not their customers, and your costs are not their costs. Zorin uses your
          own data to find the price that maximises your profit for each product individually.
        </p>
        <Callout>
          Every sale you have ever made is a data point. When more people bought at $49 than at
          $59, that gap tells Zorin exactly how price-sensitive your buyers are — and it uses
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
            <strong className="text-ink">Settings</strong> to import automatically — products
            and orders come in with one click.
          </p>
          <ScreenDiagram label="Dashboard — Products tab">
            <DiagramDashboardProducts />
          </ScreenDiagram>
        </StepBlock>

        <StepBlock number={2} title="Upload sales history">
          <p className="text-muted leading-relaxed">
            On the Products tab, use the <strong className="text-ink">Upload Sales History</strong>{" "}
            panel. Upload a CSV with one row per sale: SKU, date, units sold, and price. You need
            at least 10 data points at two or more different price points per product.
            Use <strong className="text-ink">Download sample CSV</strong> to get a correctly
            formatted template.
          </p>
          <ScreenDiagram label="Products tab — Upload Sales History">
            <DiagramUpload />
          </ScreenDiagram>
        </StepBlock>

        <StepBlock number={3} title="Fit a model">
          <p className="text-muted leading-relaxed">
            Click into any product from the Products tab, then click{" "}
            <strong className="text-ink">Fit Model</strong>. Zorin runs a regression on your
            sales data to calculate the price elasticity for that product.
          </p>
          <ScreenDiagram label="Product page — Fit Model">
            <DiagramFitModel />
          </ScreenDiagram>
        </StepBlock>

        <StepBlock number={4} title="Get a recommendation">
          <p className="text-muted leading-relaxed">
            Once the model is fitted, click{" "}
            <strong className="text-ink">Get Recommendation</strong>. Zorin finds the price
            that maximises your profit and recommends raise, lower, or hold — with an expected
            profit lift percentage.
          </p>
          <ScreenDiagram label="Product page — Recommendation">
            <DiagramRecommendation />
          </ScreenDiagram>
        </StepBlock>

        <StepBlock number={5} title="Apply the price">
          <p className="text-muted leading-relaxed">
            Click <strong className="text-ink">Apply recommendation</strong>. The price updates
            in Zorin and — if you are connected to Shopify or WooCommerce — pushes live to your
            store automatically. Your full price history is recorded on this page.
          </p>
          <ScreenDiagram label="Product page — Apply">
            <DiagramApply />
          </ScreenDiagram>
        </StepBlock>
      </Section>

      {/* Dashboard */}
      <Section id="your-dashboard" title="Understanding your dashboard">
        <p>The Overview tab shows your whole catalog at a glance.</p>
        <ScreenDiagram label="Dashboard — Overview">
          <DiagramDashboardOverview />
        </ScreenDiagram>
        <dl className="mt-4 space-y-4">
          <Term term="Products">Total products in your catalog.</Term>
          <Term term="Actionable">
            Products with a raise or lower recommendation ready to apply. Zero means all products
            are on hold — usually because the model needs more price variation in the data.
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

      {/* Integrations */}
      <Section id="integrations" title="Platform integrations">
        <p>
          Connect your store so products and orders import automatically and price changes go
          live without any extra steps.
        </p>
        <ScreenDiagram label="Settings — Connection cards">
          <DiagramSettings />
        </ScreenDiagram>
        <div className="mt-4 space-y-4">
          <IntegrationCard
            name="Shopify"
            how="Settings → Shopify Connection. Paste your store domain and an Admin API access token from a custom app."
            where="Shopify admin → Settings → Apps → Develop apps → Create an app → Configure Admin API scopes (read_products, read_orders, write_products)."
          />
          <IntegrationCard
            name="WooCommerce"
            how="Settings → WooCommerce Connection. Enter your store URL and a consumer key and secret."
            where="WordPress admin → WooCommerce → Settings → Advanced → REST API → Add key. Set permissions to Read/Write."
          />
        </div>
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
            Weak means R² is low — the data does not show a clear price-volume relationship,
            often due to seasonality or promotions. Fair means R² is 0.5–0.7. Both are usable,
            treat recommendations as directional rather than precise.
          </Faq>
          <Faq q="What is a promotion flag?">
            Sales during promotions skew the elasticity calculation. Zorin can auto-detect
            promotional spikes and exclude them from the model. Use the flag-promotions option
            on any product page.
          </Faq>
          <Faq q="Can I undo a price change?">
            Not automatically — but you can apply any price at any time. Your full price history
            is on each product page so you always know what changed and when.
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

function ScreenDiagram({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-line overflow-hidden">
      <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 border-b border-line flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="text-xs text-muted ml-2">{label}</span>
      </div>
      <div className="bg-white dark:bg-zinc-950 p-4">
        {children}
      </div>
    </div>
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

/* ── Annotated diagrams ── */

function ArrowDefs() {
  return (
    <defs>
      <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#3b82f6" />
      </marker>
    </defs>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2"
      markerEnd="url(#arrow)" />
  );
}

function Badge({ x, y, num, label }: { x: number; y: number; num: number; label: string }) {
  const nearRight = x > 430;
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill="#3b82f6" />
      <text x={x} y={y + 3.5} fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">{num}</text>
      <text x={nearRight ? x - 14 : x + 14} y={y + 3.5} fontSize="8.5" fill="#1d4ed8"
            textAnchor={nearRight ? "end" : "start"} fontWeight="600">{label}</text>
    </g>
  );
}

function DiagramDashboardProducts() {
  return (
    <svg viewBox="0 0 520 195" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* Tab bar */}
      <rect x="0" y="0" width="520" height="28" fill="#f8f8f8" rx="4" />
      <text x="16" y="18" fontSize="11" fontWeight="700" fill="#111">Overview</text>
      <rect x="80" y="4" width="60" height="20" rx="4" fill="#3b82f6" />
      <text x="110" y="18" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">Products</text>

      {/* Product rows */}
      {[
        { y: 44, sku: "TEE-001", title: "Organic Cotton Tee", price: "$32.00" },
        { y: 65, sku: "BEAN-002", title: "Merino Wool Beanie", price: "$28.00" },
        { y: 86, sku: "BOT-003", title: "Stainless Water Bottle", price: "$18.00" },
      ].map(({ y, sku, title, price }) => (
        <g key={sku}>
          <rect x="0" y={y - 10} width="520" height="22" fill={y === 44 ? "#f0f6ff" : "transparent"} />
          <text x="8" y={y + 4} fontSize="9" fill="#888">{sku}</text>
          <text x="80" y={y + 4} fontSize="10" fill="#111">{title}</text>
          <text x="350" y={y + 4} fontSize="10" fill="#111">{price}</text>
          <text x="430" y={y + 4} fontSize="9" fill="#aaa">No model</text>
        </g>
      ))}
      <text x="8" y="112" fontSize="9" fill="#aaa">+ 5 more products…</text>

      {/* Upload section */}
      <rect x="0" y="122" width="520" height="22" fill="#f8f8f8" rx="3" />
      <text x="8" y="137" fontSize="9" fontWeight="600" fill="#555">Upload Sales History</text>
      <rect x="185" y="124" width="100" height="18" rx="3" fill="#3b82f6" />
      <text x="235" y="137" fontSize="9" fill="#fff" textAnchor="middle">Choose CSV file</text>
      <text x="300" y="137" fontSize="9" fill="#3b82f6">Download sample CSV</text>

      {/* Divider */}
      <line x1="0" y1="154" x2="520" y2="154" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={110} y={176} num={1} label="Click Products tab" /><Arrow x1={110} y1={167} x2={110} y2={24} />
      <Badge x={235} y={176} num={2} label="Upload CSV here" /><Arrow x1={235} y1={167} x2={235} y2={142} />
      <Badge x={350} y={176} num={3} label="Download template" /><Arrow x1={350} y1={167} x2={350} y2={142} />
    </svg>
  );
}

function DiagramUpload() {
  return (
    <svg viewBox="0 0 520 197" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* UI */}
      <rect x="0" y="0" width="520" height="120" fill="#fafafa" rx="6" />
      <text x="12" y="20" fontSize="11" fontWeight="700" fill="#111">Upload Sales History</text>
      <text x="12" y="34" fontSize="9" fill="#888">Format: sku, date (YYYY-MM-DD), units_sold, price</text>

      {/* CSV preview */}
      <rect x="12" y="44" width="230" height="60" rx="4" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      <text x="20" y="60" fontSize="8" fill="#888" fontFamily="monospace">sku,date,units_sold,price</text>
      <text x="20" y="73" fontSize="8" fill="#555" fontFamily="monospace">TEE-001,2026-01-01,18,32.00</text>
      <text x="20" y="86" fontSize="8" fill="#555" fontFamily="monospace">TEE-001,2026-02-01,11,35.00</text>
      <text x="20" y="99" fontSize="8" fill="#888" fontFamily="monospace">…</text>

      {/* Upload button */}
      <rect x="256" y="44" width="120" height="26" rx="4" fill="#3b82f6" />
      <text x="316" y="61" fontSize="10" fill="#fff" textAnchor="middle" fontWeight="600">Choose CSV file</text>

      {/* Download link */}
      <text x="256" y="90" fontSize="9" fill="#3b82f6">Download sample CSV →</text>

      {/* Divider */}
      <line x1="0" y1="132" x2="520" y2="132" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={120} y={154} num={1} label="Your CSV data" /><Arrow x1={120} y1={145} x2={120} y2={105} />
      <Badge x={316} y={154} num={2} label="Upload button" /><Arrow x1={316} y1={145} x2={316} y2={70} />
      <Badge x={265} y={177} num={3} label="Get template" /><Arrow x1={265} y1={168} x2={265} y2={91} />
    </svg>
  );
}

function DiagramFitModel() {
  return (
    <svg viewBox="0 0 520 198" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* Product header */}
      <text x="8" y="16" fontSize="12" fontWeight="700" fill="#111">Organic Cotton Tee</text>
      <text x="8" y="30" fontSize="9" fill="#888">SKU-TEE-001 · $32.00 current price</text>

      {/* Sales records count */}
      <rect x="0" y="42" width="150" height="42" rx="6" fill="#f0f6ff" stroke="#bdd4f8" strokeWidth="1" />
      <text x="10" y="58" fontSize="9" fill="#555">Sales records</text>
      <text x="10" y="76" fontSize="16" fontWeight="700" fill="#111">23</text>

      {/* Fit Model button */}
      <rect x="164" y="46" width="110" height="28" rx="6" fill="#111" />
      <text x="219" y="64" fontSize="10" fill="#fff" textAnchor="middle" fontWeight="600">Fit Model</text>

      {/* Get Recommendation button (greyed) */}
      <rect x="286" y="46" width="140" height="28" rx="6" fill="#e5e7eb" />
      <text x="356" y="64" fontSize="10" fill="#aaa" textAnchor="middle">Get Recommendation</text>

      {/* Result area */}
      <rect x="0" y="100" width="520" height="44" rx="6" fill="#f8f8f8" stroke="#e5e7eb" strokeWidth="1" />
      <text x="12" y="118" fontSize="9" fill="#888">Model result will appear here after fitting</text>
      <text x="12" y="134" fontSize="9" fill="#aaa">Elasticity · R² score · Data points used</text>

      {/* Divider */}
      <line x1="0" y1="156" x2="520" y2="156" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={219} y={178} num={1} label="Click Fit Model" /><Arrow x1={219} y1={169} x2={219} y2={74} />
      <Badge x={356} y={178} num={2} label="Unlocks Recommend" /><Arrow x1={356} y1={169} x2={356} y2={74} />
      <Badge x={65} y={178} num={3} label="Result shown here" /><Arrow x1={65} y1={169} x2={65} y2={144} />
    </svg>
  );
}

function DiagramRecommendation() {
  return (
    <svg viewBox="0 0 520 195" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* Rec card */}
      <rect x="0" y="0" width="520" height="140" rx="8" fill="#f0f6ff" stroke="#bdd4f8" strokeWidth="1" />

      {/* Badge */}
      <rect x="12" y="12" width="38" height="18" rx="4" fill="#16a34a" />
      <text x="31" y="24" fontSize="8" fill="#fff" textAnchor="middle" fontWeight="700">RAISE</text>

      {/* Current → Suggested prices */}
      <text x="12" y="52" fontSize="9" fill="#888">Current price</text>
      <text x="12" y="70" fontSize="18" fontWeight="700" fill="#111">$32.00</text>

      <text x="115" y="70" fontSize="18" fill="#aaa">→</text>

      <text x="160" y="52" fontSize="9" fill="#888">Suggested price</text>
      <text x="160" y="70" fontSize="18" fontWeight="700" fill="#3b82f6">$35.00</text>

      <text x="340" y="52" fontSize="9" fill="#888">Expected profit lift</text>
      <text x="340" y="70" fontSize="18" fontWeight="700" fill="#16a34a">+14.2%</text>

      {/* Apply button */}
      <rect x="12" y="100" width="160" height="28" rx="6" fill="#3b82f6" />
      <text x="92" y="118" fontSize="10" fill="#fff" textAnchor="middle" fontWeight="600">Apply recommendation</text>

      {/* Divider */}
      <line x1="0" y1="152" x2="520" y2="152" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={190} y={174} num={1} label="Optimal price" /><Arrow x1={190} y1={165} x2={190} y2={72} />
      <Badge x={390} y={174} num={2} label="Extra profit" /><Arrow x1={390} y1={165} x2={390} y2={72} />
      <Badge x={92} y={174} num={3} label="Click to apply" /><Arrow x1={92} y1={165} x2={92} y2={128} />
    </svg>
  );
}

function DiagramApply() {
  return (
    <svg viewBox="0 0 520 195" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* Success state */}
      <rect x="0" y="0" width="520" height="66" rx="6" fill="#f0fdf4" stroke="#86efac" strokeWidth="1" />
      <text x="12" y="20" fontSize="10" fontWeight="700" fill="#16a34a">✓ Price updated</text>
      <text x="12" y="36" fontSize="9" fill="#555">$32.00 → $35.00 applied at 14:23 today</text>
      <rect x="12" y="46" width="86" height="12" rx="2" fill="#bbf7d0" />
      <text x="55" y="56" fontSize="7.5" fill="#16a34a" textAnchor="middle">Shopify: synced ✓</text>

      {/* Price history */}
      <text x="0" y="88" fontSize="10" fontWeight="600" fill="#111">Price history</text>
      <rect x="0" y="96" width="520" height="22" fill="#f8f8f8" rx="3" />
      <text x="8" y="111" fontSize="9" fill="#888">$29.00 → $32.00</text>
      <text x="200" y="111" fontSize="9" fill="#aaa">3 months ago</text>
      <rect x="0" y="120" width="520" height="22" fill="#eff6ff" rx="3" />
      <text x="8" y="135" fontSize="9" fill="#3b82f6" fontWeight="600">$32.00 → $35.00</text>
      <text x="200" y="135" fontSize="9" fill="#3b82f6">just now</text>

      {/* Divider */}
      <line x1="0" y1="152" x2="520" y2="152" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={55} y={174} num={1} label="Confirmation + sync" /><Arrow x1={55} y1={165} x2={55} y2={66} />
      <Badge x={300} y={174} num={2} label="Price in history" /><Arrow x1={300} y1={165} x2={300} y2={142} />
    </svg>
  );
}

function DiagramDashboardOverview() {
  return (
    <svg viewBox="0 0 520 180" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* Stat cards — 5 across */}
      {[
        { x: 0, label: "PRODUCTS", value: "8", sub: "in catalog" },
        { x: 106, label: "ACTIONABLE", value: "3", sub: "ready to apply" },
        { x: 212, label: "MARGIN", value: "1", sub: "< 15%", red: true },
        { x: 318, label: "AVG LIFT", value: "+14%", sub: "across catalog" },
        { x: 418, label: "OPP.", value: "$420", sub: "per month" },
      ].map(({ x, label, value, sub, red }) => (
        <g key={x}>
          <rect x={x} y="0" width="98" height="68" rx="6" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
          <text x={x + 8} y="14" fontSize="7" fill="#888" fontWeight="600">{label}</text>
          <text x={x + 8} y="40" fontSize="18" fontWeight="700" fill={red ? "#ef4444" : "#111"}>{value}</text>
          <text x={x + 8} y="56" fontSize="8" fill="#888">{sub}</text>
        </g>
      ))}

      {/* Model health bar */}
      <rect x="0" y="78" width="520" height="24" rx="6" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      <text x="8" y="94" fontSize="8" fill="#888" fontWeight="600">MODEL HEALTH</text>
      <rect x="110" y="84" width="80" height="12" rx="2" fill="#16a34a" />
      <rect x="192" y="84" width="60" height="12" rx="2" fill="#84cc16" />
      <rect x="254" y="84" width="40" height="12" rx="2" fill="#f59e0b" />
      <rect x="296" y="84" width="200" height="12" rx="2" fill="#e5e7eb" />

      {/* Divider */}
      <line x1="0" y1="114" x2="520" y2="114" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={150} y={136} num={1} label="Prices ready to apply" /><Arrow x1={150} y1={127} x2={150} y2={68} />
      <Badge x={210} y={158} num={2} label="More data = stronger" /><Arrow x1={210} y1={149} x2={210} y2={102} />
      <Badge x={465} y={136} num={3} label="Profit opportunity" /><Arrow x1={465} y1={127} x2={465} y2={68} />
    </svg>
  );
}

function DiagramSettings() {
  return (
    <svg viewBox="0 0 520 213" className="w-full" style={{ fontFamily: "system-ui, sans-serif" }}>
      <ArrowDefs />

      {/* Shopify card */}
      <rect x="0" y="0" width="520" height="70" rx="8" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      <text x="12" y="18" fontSize="11" fontWeight="700" fill="#111">Shopify Connection</text>
      <text x="12" y="32" fontSize="9" fill="#888">Connect your store to sync products and orders.</text>
      <rect x="12" y="42" width="155" height="18" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
      <text x="20" y="55" fontSize="8.5" fill="#aaa">mystore.myshopify.com</text>
      <rect x="178" y="42" width="130" height="18" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
      <text x="186" y="55" fontSize="8.5" fill="#aaa">shpat_••••••••</text>
      <rect x="320" y="42" width="70" height="18" rx="4" fill="#111" />
      <text x="355" y="55" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="600">Connect</text>

      {/* WooCommerce card */}
      <rect x="0" y="82" width="520" height="76" rx="8" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      <text x="12" y="100" fontSize="11" fontWeight="700" fill="#111">WooCommerce Connection</text>
      <text x="12" y="114" fontSize="9" fill="#888">Connect your WooCommerce store to sync products and orders.</text>
      <rect x="12" y="124" width="125" height="18" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
      <text x="20" y="137" fontSize="8.5" fill="#aaa">https://mystore.com</text>
      <rect x="148" y="124" width="100" height="18" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
      <text x="156" y="137" fontSize="8.5" fill="#aaa">ck_••••••••</text>
      <rect x="258" y="124" width="100" height="18" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
      <text x="266" y="137" fontSize="8.5" fill="#aaa">cs_••••••••</text>
      <rect x="368" y="124" width="70" height="18" rx="4" fill="#7c3aed" />
      <text x="403" y="137" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="600">Connect</text>

      {/* Divider */}
      <line x1="0" y1="170" x2="520" y2="170" stroke="#e5e7eb" strokeWidth="1" />

      <Badge x={90} y={192} num={1} label="Store URL and API key" /><Arrow x1={90} y1={183} x2={90} y2={60} />
      <Badge x={355} y={192} num={2} label="Click Connect to link" /><Arrow x1={355} y1={183} x2={355} y2={60} />
    </svg>
  );
}
