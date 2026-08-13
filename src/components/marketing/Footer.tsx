export function Footer() {
  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
                Z
              </span>
              Zorin
            </a>
            <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-zinc-500">
              Pricing intelligence for e-commerce sellers.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-10">
            <div>
              <h4 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Product
              </h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a href="/#how-it-works" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="/#features" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/blog" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="/shopify-profit-margin-calculator" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Profit margin calculator
                  </a>
                </li>
                <li>
                  <a href="/signup" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Start free trial
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Integrations
              </h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a href="/integrations/shopify" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Shopify
                  </a>
                </li>
                <li>
                  <a href="/integrations/woocommerce" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    WooCommerce
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Account
              </h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a href="/login" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Log in
                  </a>
                </li>
                <li>
                  <a href="/signup" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Sign up
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Legal
              </h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a href="/privacy" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} Zorin. All rights reserved.
          </p>
          <a href="https://smollaunch.com" target="_blank" rel="noopener">
            <img
              src="/badges/smollaunch-featured.svg"
              alt="Zorin — Featured on Smol Launch"
              loading="lazy"
              width={250}
              height={60}
              className="h-10 w-auto opacity-90 transition-opacity hover:opacity-100"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
