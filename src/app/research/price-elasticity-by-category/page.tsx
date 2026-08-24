import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const BASE_URL = "https://www.tryzorin.com";
const PAGE_URL = `${BASE_URL}/research/price-elasticity-by-category`;
const LAST_UPDATED = "2026-08-23";

export const metadata = {
  title: "Price Elasticity by Product Category (Sourced Data) - Zorin",
  description:
    "A sourced reference of real price elasticity of demand coefficients by ecommerce product category, compiled from peer-reviewed studies and government data. Updated periodically.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Price Elasticity of Demand by Product Category",
    description:
      "Real, sourced elasticity coefficients across 8 ecommerce categories, compiled from peer-reviewed research and government data.",
    url: PAGE_URL,
    type: "article",
  },
};

type CategoryRow = {
  category: string;
  coefficient: string;
  classification: string;
  explanation: string;
  note?: string;
  sources: { label: string; url: string; publisher: string }[];
};

const TIER_1: CategoryRow[] = [
  {
    category: "Food & grocery staples",
    coefficient: "Near 0 (flour, rice, pasta, biscuits); -1.10 (citrus)",
    classification: "Perfectly inelastic to elastic, varies sharply by staple vs. non-staple",
    explanation:
      "Staple grains and prepared flour products sit at the inelastic extreme of this dataset because they meet the two conditions economists treat as the strongest predictors of low elasticity: no meaningful substitute, and a habitual rather than deliberated purchase. A shopper doesn't compare five brands of flour before an occasional bake. They buy what they always buy, and a moderate price change rarely disrupts that. Citrus breaks the pattern for a structural reason: a shopper can switch to a different fruit, or buy less, without losing anything from their routine, and citrus prices also swing with growing-season supply shocks in a way flour doesn't. Both push measured elasticity higher. For a grocery or specialty-food seller, the category-level average hides a wide internal range. How replaceable a specific SKU feels to a specific customer predicts its elasticity, not which broad food category it sits in.",
    note: "Staple grains and baked goods are almost perfectly inelastic; fresh citrus is the most elastic food category measured in this dataset.",
    sources: [
      {
        label: "The Demand for Disaggregated Food-Away-From-Home and Food-at-Home Products in the United States (ERR-139)",
        url: "https://www.ers.usda.gov/sites/default/files/_laserfiche/publications/45003/30438_err139.pdf",
        publisher: "USDA Economic Research Service",
      },
    ],
  },
  {
    category: "Alcohol (beer, wine, spirits)",
    coefficient: "Beer -0.17 to -0.30, wine -0.23 to -0.66, spirits -0.39 to -0.65",
    classification: "Inelastic, spirits somewhat more elastic than beer",
    explanation:
      "Alcohol is one of the most heavily studied categories in applied demand economics, because governments use these coefficients to model the revenue and consumption effects of excise tax changes. That's why the sourcing here is unusually strong: three separate meta-analyses, each aggregating dozens of underlying studies, arrive at the same ranking even though their corrected point estimates differ. Beer being the least price-sensitive of the three and spirits the most tracks with habitual, low-consideration purchasing for beer against a wider field of close substitutes for hard liquor. One thing to flag for anyone citing this category: elasticity estimates for alcohol ran higher in uncorrected literature reviews than in analyses that adjust for publication bias and outlier studies. The corrected figures here are 28 to 29 percent less elastic than the older consensus averages still circulating in some secondary sources.",
    note: "Three independent meta-analyses converge on the same ranking (beer least elastic, spirits most) even though absolute values differ by correction method.",
    sources: [
      {
        label: "Meta-analysis of alcohol price and income elasticities, with corrections for publication bias",
        url: "https://healtheconomicsreview.biomedcentral.com/articles/10.1186/2191-1991-3-17",
        publisher: "Health Economics Review",
      },
      {
        label: "Robust Demand Elasticities for Wine and Distilled Spirits",
        url: "https://www.researchgate.net/publication/259762127_Robust_Demand_Elasticities_for_Wine_and_Distilled_Spirits_Meta-Analysis_with_Corrections_for_Outliers_and_Publication_Bias",
        publisher: "Journal of Wine Economics (meta-analysis)",
      },
    ],
  },
  {
    category: "Soft drinks & sugar-sweetened beverages",
    coefficient: "-1.06 to -1.37",
    classification: "Elastic",
    explanation:
      "Soft drinks sit firmly on the elastic side. The two country-level studies behind this figure, Mexico and Chile, were both conducted around proposed or enacted sugar taxes, so the underlying data captures real consumer behavior under an actual price shock, not a hypothetical one. Soft drinks compete against a wide field of close substitutes, including plain water: one of the underlying studies measured that a 10 percent increase in soft drink prices pushed water consumption up by 6.3 percent. That cross-price relationship matters for a beverage seller beyond the headline number. A price increase on a sugar-sweetened product shrinks total volume and pushes customers toward a specific, identifiable alternative, a more actionable signal than an aggregate elasticity coefficient alone.",
    note: "Consistent across two independent country-level studies (Mexico, Chile).",
    sources: [
      {
        label: "Price elasticity of the demand for soft drinks, other sugar-sweetened beverages and energy dense food in Chile",
        url: "https://bmcpublichealth.biomedcentral.com/articles/10.1186/s12889-017-4098-x",
        publisher: "BMC Public Health",
      },
    ],
  },
  {
    category: "Apparel & clothing",
    coefficient: "-1.17 (t-shirts) to -2.86 (casual/athletic wear)",
    classification: "Elastic, more so for casual/athletic than basics",
    explanation:
      "Apparel is the widest-ranging category in this dataset, and the range itself is the finding. Casual and athletic wear, at a coefficient near -2.86, sits among the most elastic goods measured anywhere in this reference. Basics like t-shirts, at -1.17, are elastic but far less so. Substitutability at the point of purchase likely drives the gap: an athletic-wear SKU competes against dozens of near-identical alternatives across brands the customer already trusts, while a basic t-shirt purchase is closer to routine replenishment than a considered comparison. One dataset also found a gender gap: a matched price change moved men's clothing demand more than women's (2.83 percent versus 2.13 percent), which the underlying study attributes to differences in brand loyalty between the two segments, not any difference in the garments themselves. Averaging elasticity across an entire apparel catalog will mislead. A hero athletic-wear SKU and a basics staple in the same store are different pricing problems.",
    note: "Wide range across sub-categories and studies; men's clothing measured somewhat more elastic than women's in one dataset (-2.83% vs -2.13% for a matched price change).",
    sources: [
      {
        label: "Demand Analysis of Clothing and Footwear: Price, Expenditure, and Economic Crisis Effects",
        url: "https://www.researchgate.net/publication/276219645_Demand_Analysis_of_Clothing_and_Footwear_The_Effects_of_Price_Total_Consumption_Expenditures_and_Economic_Crisis",
        publisher: "Academic study (peer-reviewed)",
      },
    ],
  },
  {
    category: "Household appliances",
    coefficient: "Refrigerators -0.40, clothes washers -0.31, dishwashers -0.32 (avg -0.35)",
    classification: "Inelastic",
    explanation:
      "Major appliances behave inelastically for a reason that has nothing to do with brand loyalty or habit and everything to do with timing: these are need-triggered purchases. A refrigerator gets bought because the old one failed or a household moved, not because a discount happened to be running, which caps how much a price change can pull demand forward or push it back. The two sources behind this figure, a US Department of Energy study and a Lawrence Berkeley National Laboratory analysis, work from real market-level sales data rather than surveys, a stronger evidentiary basis than most consumer-goods elasticity research relies on. One caveat from the underlying research: brand-level elasticity for the same appliance categories runs higher, often -2.0 or more. A customer who has already decided to buy a refrigerator this month will switch between brands over price, even though the decision to buy a refrigerator at all barely responds to price. That distinction, category-level versus brand-level elasticity, matters beyond appliances too.",
    sources: [
      {
        label: "An Analysis of the Price Elasticity of Demand for Household Appliances",
        url: "https://www.osti.gov/servlets/purl/929429",
        publisher: "US Department of Energy / Office of Scientific and Technical Information",
      },
      {
        label: "Estimating Price Elasticity Using Market-Level Appliance Data",
        url: "https://eta.lbl.gov/publications/estimating-price-elasticity-using",
        publisher: "Lawrence Berkeley National Laboratory",
      },
    ],
  },
  {
    category: "Books",
    coefficient: "-1.4 aggregate; e-books -0.20 to -0.27 (trending less elastic over time)",
    classification: "Elastic, e-books far less so and growing more inelastic year over year",
    explanation:
      "Physical book demand is elastic overall, but the e-book figure inside this same research is one of the more interesting findings in this dataset. E-book elasticity measured -0.270 in January 2011 and drifted to -0.201 by December 2012, a decline of about 0.003 per month: digital book buyers grew less price-sensitive over the study period, not more. The likely explanation is platform lock-in. As a reader accumulates a library inside one ecosystem (annotations, purchase history, a specific device), the switching cost of comparison-shopping a single new title rises even if the sticker price doesn't. The same research found that bestseller titles draw a more price-sensitive customer than the broader catalog, which is why retailers discount bestsellers specifically rather than applying a flat markdown across the whole category.",
    sources: [
      {
        label: "Retail Consolidation and the Price Elasticity of Demand for Books",
        url: "https://www.researchgate.net/publication/267713110_Retail_Consolidation_And_The_Price_Elasticity_Of_Demand_For_Books",
        publisher: "International Business & Economics Research Journal (peer-reviewed)",
      },
    ],
  },
];

const TIER_2: CategoryRow[] = [
  {
    category: "Furniture & home goods",
    coefficient: "-0.42 (moderate price increases) to -0.56 (larger increases); -1.3 is the commonly-cited textbook figure",
    classification: "Inelastic to unitary, depending on methodology",
    explanation:
      "Furniture is a contested category in the literature, and we're presenting that disagreement directly rather than resolving it artificially. The -1.3 figure in most introductory economics material traces back to older, broader estimates and gets repeated because it's easy to cite, not necessarily because it's the most reliable current number. A more recent industry-cycle analysis, built from real furniture sales data tracked against actual price movements since 1965, found a less elastic response: -0.42 in years with moderate price increases, widening to -0.56 in years with sharper increases. That same analysis found something that matters for a seller thinking about macro timing as much as individual pricing decisions. In years when existing home sales rose by a median of 9 percent, furniture demand increased alongside furniture prices, a positive elasticity reading, because a strengthening housing market pulls new-home furniture purchases forward hard enough to overwhelm the normal price effect. Elasticity read from a single time window can mislead without accounting for what else was happening in the broader market.",
    note: "Real-market industry-cycle analysis and the standard textbook estimate disagree meaningfully. We show both rather than picking one.",
    sources: [
      {
        label: "Furniture Demand Faces the Elasticity Test",
        url: "https://www.zelmanassociates.com/resources/zelman-insights/2026-02-(1)/furniture-demand-faces-the-elasticity-test,-but-ho",
        publisher: "Zelman & Associates (industry research)",
      },
    ],
  },
  {
    category: "Footwear",
    coefficient: "-0.7 general market; premium/branded footwear much more elastic",
    classification: "Inelastic overall, elastic at the premium-brand tier",
    explanation:
      "The general footwear market reads as inelastic at the category level, the same logic that applies to apparel basics: most footwear purchases replace a worn-out pair rather than respond to a price signal. That aggregate figure hides a sharp split once brand enters the picture. Sources discussing premium and heavily-branded footwear describe demand as more elastic than the category average, the same category-versus-brand distinction seen in household appliances above. A customer who has decided to buy shoes this month isn't very price-sensitive about whether to buy shoes at all, but grows more price-sensitive once comparing a specific premium brand against its close substitutes. We're marking this Tier 2 because the numeric estimates we found trace to a single frequently-cited figure, not a corroborating meta-analysis like food, alcohol, or appliances above.",
    sources: [
      {
        label: "Price elasticity estimate for US footwear market",
        url: "https://homework.study.com/explanation/according-to-a-study-the-price-elasticity-of-shoes-in-the-united-states-is-0-7-and-the-income-elasticity-is-0-9-a-would-you-suggest-that-the-brown-shoe-company-cut-its-prices-to-increase-its-reven.html",
        publisher: "Cited academic estimate (secondary source, single figure)",
      },
    ],
  },
];

const NOT_VERIFIED = [
  {
    category: "Skincare & cosmetics",
    reason:
      "Skincare and cosmetics are among the most common ecommerce verticals, and a category we cover on our own blog, but we found no real, numeric elasticity coefficient anywhere in the published literature. What exists is directional: one peer-reviewed study found skincare buyers respond more strongly to price cuts than to price increases, an asymmetric pattern rather than a single coefficient, and separate research on organic cosmetics used conjoint analysis to identify price thresholds without producing a standard elasticity figure comparable to the categories above. We named the gap rather than converting a qualitative finding into a number. It's also the kind of category where a merchant's own sales history beats any published average, since brand positioning swings skincare price sensitivity in ways a category-wide figure would wash out.",
  },
  {
    category: "Jewelry & luxury goods",
    reason:
      "The published sources on luxury goods elasticity contradict each other. Some frame luxury demand as inelastic (rare, high-status goods with weak substitutes), others as elastic (discretionary, easily postponed purchases), and neither side offers an empirical coefficient we could verify. Secondary sources describe jewelry as price-sensitive because it's optional spending, but again without a number behind the claim. Given the direct contradiction in the literature, excluding a number entirely seemed more honest than picking whichever side of the debate produced a more citable figure.",
  },
  {
    category: "Dietary supplements",
    reason:
      "No category-specific published elasticity research surfaced in our search. The closest adjacent literature covers food and nutrient price elasticities broadly, relevant to grocery pricing policy research, but doesn't isolate supplements as their own category. Applying a general food coefficient to supplements would misrepresent research that was never designed to describe that market.",
  },
  {
    category: "Toys",
    reason:
      "The one numeric figure that surfaces repeatedly in searches for this category, -1.2 to -1.5, is measured for video game consoles, a category most economists would classify under consumer electronics, not general toys. Broader toy-category commentary in circulation is qualitative only. We found the claim \"toys have a lot of price elasticity\" stated outright with no coefficient attached, exactly the kind of unsourced assertion this page exists to stop repeating.",
  },
  {
    category: "Sporting goods",
    reason:
      "We found no study that isolates sporting goods or equipment as its own measured category. Secondary sources describe the category as more elastic because of high price points and many available substitutes, a reasonable theoretical prior, but not something we'll present as a sourced figure.",
  },
  {
    category: "Pet products",
    reason:
      "This one is the clearest example of why methodology matters here. A dog food elasticity figure of 0.8 circulates widely enough in search results that it initially looked usable. Tracing it back, it turns out to be a textbook homework exercise, a hypothetical \"Canine Ville\" problem set used to teach the elasticity formula itself, not a finding from any real study of pet food purchasing behavior. A number that looks precise and gets repeated across multiple sites isn't the same as a number backed by real data. Catching that distinction is most of what this page is for.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is price elasticity of demand?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Price elasticity of demand measures how much the quantity of a product sold changes in response to a change in its price. A coefficient below 1 (in absolute value) means demand is inelastic, customers keep buying even if price moves. Above 1 means demand is elastic, customers are highly price-sensitive.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce product categories have the most inelastic demand?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the sourced data on this page, staple food and grocery items (flour, rice, pasta) and household appliances are the most inelastic categories, meaning demand barely moves even when price does.",
      },
    },
    {
      "@type": "Question",
      name: "Which ecommerce product categories have the most elastic demand?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Books, apparel (especially casual and athletic wear), and sugar-sweetened beverages show the most elastic demand in the sourced studies on this page, meaning a price change produces a proportionally larger change in units sold.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use these category averages to set my own store's prices?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Treat these as a starting reference point, not a substitute for your own data. A category average blends many brands, price points, and customer bases together. Your specific product's elasticity, calculated from your own sales history, is a more reliable signal for an actual pricing decision than a market-wide average.",
      },
    },
    {
      "@type": "Question",
      name: "Why are some categories missing from this page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We only publish a coefficient when we found real, sourced research behind it. Several common ecommerce categories, including skincare, jewelry, and supplements, don't have verifiable published elasticity data yet, so we've listed them separately as gaps rather than filling them with a guess.",
      },
    },
    {
      "@type": "Question",
      name: "What's the difference between category-level and brand-level elasticity?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Category-level elasticity measures how total demand for a broad category (all refrigerators, all sneakers) responds to price. Brand-level elasticity measures how demand for one specific brand responds, holding the category decision constant. Brand-level elasticity is consistently higher across the categories in this dataset, since a customer who has already decided to buy within a category is far more willing to switch brands over price than to abandon the purchase entirely.",
      },
    },
    {
      "@type": "Question",
      name: "How often is this page updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We revisit this page periodically to add newly published research and fill gaps in currently unverified categories. The page shows a last-updated date at the top.",
      },
    },
  ],
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Price Elasticity of Demand by Ecommerce Product Category",
  description:
    "A sourced compilation of published price elasticity of demand coefficients across ecommerce-relevant product categories, drawn from peer-reviewed academic research and government economic data.",
  url: PAGE_URL,
  dateModified: LAST_UPDATED,
  creator: { "@type": "Organization", name: "Zorin", url: BASE_URL },
  license: "https://www.tryzorin.com/terms",
  variableMeasured: "Price elasticity of demand coefficient",
  spatialCoverage: "United States (primary), with some international study data",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Research", item: `${BASE_URL}/research` },
    { "@type": "ListItem", position: 3, name: "Price Elasticity by Category", item: PAGE_URL },
  ],
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PriceElasticityByCategoryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pb-32">
        <a href="/blog/cluster/price-elasticity" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600">
          ← Price Elasticity cluster
        </a>

        <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          Research
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Price Elasticity of Demand by Product Category
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated {formatDate(LAST_UPDATED)}</p>

        <p className="mt-6 max-w-[65ch] text-lg leading-relaxed text-zinc-600">
          A sourced reference of real price elasticity of demand coefficients across ecommerce
          product categories, compiled from peer-reviewed academic research and government
          economic data. Every figure below links to its original source. Categories where we
          could not find verifiable data are listed separately rather than filled in with a guess.
        </p>
        <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-zinc-600">
          Price elasticity is one of the most cited concepts in pricing strategy, and one of the
          most poorly sourced in practice. Search &ldquo;price elasticity by category&rdquo; and
          you'll find dozens of blog posts asserting numbers with no attribution, homework-exercise
          figures presented as empirical findings, and the same handful of decades-old textbook
          examples repeated without context. This page fixes that for the categories where it's
          possible. We searched the published economics literature and government data, kept only
          figures we could trace to a real study, and organized the result by how strong that
          sourcing is. Where the literature disagrees with itself, we show the disagreement instead
          of picking a side. Where nothing verifiable exists, we say so instead of leaving a gap for
          someone else to fill with a guess.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Methodology</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            We searched for published elasticity estimates across categories relevant to
            independent and small-to-midsize ecommerce sellers, prioritizing sources in this
            order: peer-reviewed meta-analyses that aggregate multiple underlying studies, single
            peer-reviewed academic studies, government economic data (USDA Economic Research
            Service, US Department of Energy, Lawrence Berkeley National Laboratory), and
            industry research built from real transaction data. We excluded figures that trace
            back to hypothetical textbook exercises, unsourced blog assertions, or claims we
            couldn't connect to an underlying dataset or study, even when those figures appear
            frequently in search results.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Categories split into three groups. <strong>Strongly sourced</strong> categories have
            multiple corroborating studies, typically including at least one meta-analysis or
            government dataset. <strong>Moderately sourced</strong> categories have one usable,
            traceable figure from a thinner evidence base than the first tier. We include these
            with a caveat rather than omitting them, since a single well-sourced study still beats
            nothing. <strong>Not verified</strong> categories are ones we searched for and couldn't
            find defensible published data on, listed for transparency rather than silently
            omitted.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Where multiple credible sources disagree, we report the range and explain the likely
            reason (different correction methods, different time periods, category-level versus
            brand-level measurement) instead of averaging conflicting numbers into a single figure
            that would misrepresent the actual state of the research. This page contains no data
            from Zorin's own merchant base, only independently published third-party research.
            That distinction matters: the point of this page is to be verifiable by a reader who
            has never used Zorin at all.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Strongly Sourced Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">Multiple corroborating peer-reviewed or government sources.</p>

        <div className="mt-6 flex flex-col gap-4">
          {TIER_1.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.category}</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  {row.classification}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.coefficient}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{row.explanation}</p>
              <div className="mt-4 flex flex-col gap-1">
                {row.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {s.label}, {s.publisher}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Moderately Sourced Categories</h2>
        <p className="mt-2 text-sm text-zinc-500">
          A usable figure exists, but from thinner or conflicting sources. Included with caveats
          rather than excluded.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {TIER_2.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.category}</h3>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {row.classification}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm text-zinc-700">{row.coefficient}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{row.explanation}</p>
              <div className="mt-4 flex flex-col gap-1">
                {row.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {s.label}, {s.publisher}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Categories We Couldn&apos;t Verify Yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          We searched for each of these specifically and either found no empirical data, or found
          numbers we judged unreliable enough to exclude. Each entry below explains what we found
          and why it fell short.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {NOT_VERIFIED.map((row) => (
            <div key={row.category} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-700">{row.category}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{row.reason}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Limitations</h2>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-zinc-600">
          Most of the studies behind this page measure elasticity at the market or category level,
          not the brand or individual-SKU level. As the appliances and footwear entries above show,
          brand-level elasticity for the same broad category runs two to three times higher.
          Several figures come from a single country or study period, Mexico and Chile for soft
          drinks, a specific US furniture-price cycle since 1965, and may not transfer cleanly to a
          different market or era. Academic elasticity research is also unevenly distributed across
          categories for reasons that have nothing to do with ecommerce relevance: alcohol and food
          get studied heavily because governments use the data for tax policy, while categories
          like skincare or supplements attract comparatively little rigorous economic research
          despite being large, real ecommerce markets. That imbalance in the literature explains
          why six categories on this page have no verified figure. It has nothing to do with
          whether those categories matter.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">What This Means for Your Own Store</h2>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-zinc-600">
          These are market-wide averages, blended across many brands, price points, and customer
          bases. Treat them as a starting reference, not a substitute for your own data. A specific
          product in your catalog can behave differently from its category average depending on
          your brand positioning, your customers, and your competitive set. The appliances and
          apparel sections above both show category-level and brand-level elasticity diverging
          sharply within the same product type. <a href="/features/price-elasticity-modeling" className="text-blue-600 hover:underline">Zorin fits an elasticity model directly to your own sales history</a>,
          per SKU, so the number you act on reflects your actual customers, not a category-wide
          blend. If you want to run the calculation yourself first, <a href="/blog/how-to-calculate-price-elasticity-for-your-shopify-store" className="text-blue-600 hover:underline">the Shopify walkthrough</a> and <a href="/blog/how-to-calculate-price-elasticity-for-your-woocommerce-store" className="text-blue-600 hover:underline">the WooCommerce walkthrough</a> cover
          the same formula used to produce the figures above.
        </p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-900">
            See your own catalog&apos;s elasticity, not a category average.
          </p>
          <a
            href="/signup"
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            Start free trial
          </a>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-zinc-900">Frequently Asked Questions</h2>
        <div className="mt-4 flex flex-col gap-5">
          {faqSchema.mainEntity.map((q) => (
            <div key={q.name}>
              <h3 className="text-sm font-semibold text-zinc-900">{q.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900">How to Cite This Page</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Zorin. &ldquo;Price Elasticity of Demand by Product Category.&rdquo; Updated{" "}
            {formatDate(LAST_UPDATED)}.{" "}
            <a href={PAGE_URL} className="text-blue-600 hover:underline">
              {PAGE_URL}
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
