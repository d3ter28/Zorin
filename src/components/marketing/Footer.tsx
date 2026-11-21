import { FeaturedOnBadges } from "./FeaturedOnBadges";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Read",
    links: [
      { href: "/blog/all", label: "All articles" },
      { href: "/blog", label: "Topics" },
      { href: "/research", label: "Research reports" },
      { href: "/glossary", label: "Pricing glossary" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/price-elasticity-calculator", label: "Price elasticity calculator" },
      { href: "/shopify-profit-margin-calculator", label: "Shopify profit margin calculator" },
      { href: "/woocommerce-profit-margin-calculator", label: "WooCommerce profit margin calculator" },
      { href: "/van-westendorp-survey-template", label: "Van Westendorp survey template" },
      { href: "/price-increase-email-template", label: "Price increase email template" },
      { href: "/markdown-clearance-spreadsheet", label: "Markdown & clearance spreadsheet" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/research/price-elasticity-by-category", label: "Price elasticity by category" },
      { href: "/research/profit-margins-by-product-category", label: "Profit margins by category" },
      { href: "/research/state-of-ecommerce-pricing-2026", label: "State of ecommerce pricing 2026" },
    ],
  },
  {
    title: "Zorin",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink">
      <div className="mx-auto max-w-[1360px] px-6 py-14 md:px-7">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <a href="/" className="font-serif text-2xl font-semibold tracking-tight text-ink">
              Zorin
            </a>
            <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-ink-2">
              Practical pricing guides for Shopify and WooCommerce sellers, with the math worked out.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="label-mono text-faint">{col.title}</h4>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-sm text-ink-2 transition-colors hover:text-accent">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <FeaturedOnBadges />

        <div className="mt-6 border-t border-line pt-6 font-mono text-xs text-faint">
          &copy; {new Date().getFullYear()} Zorin
        </div>
      </div>
    </footer>
  );
}
