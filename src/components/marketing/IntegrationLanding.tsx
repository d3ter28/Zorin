interface IntegrationLandingProps {
  platform: string;
  ctaLabel: string;
  intro: string;
  how: string;
  where: string;
  syncedData: string[];
  faqs: { q: string; a: string }[];
}

export function IntegrationLanding({ platform, ctaLabel, intro, how, where, syncedData, faqs }: IntegrationLandingProps) {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
        Sync Zorin with your {platform} store
      </h1>
      <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">{intro}</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/guide/settings-integrations.png"
          alt={`Settings page with the ${platform} connection card`}
          className="w-full"
        />
        <p className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500">
          Video walkthrough coming soon - screenshot above shows the real connection screen.
        </p>
      </div>

      <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">How to connect</h2>
        <ol className="mt-4 flex flex-col gap-3">
          <li className="flex gap-3 text-sm leading-relaxed text-zinc-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              1
            </span>
            {where}
          </li>
          <li className="flex gap-3 text-sm leading-relaxed text-zinc-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              2
            </span>
            {how}
          </li>
        </ol>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">What stays in sync</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {syncedData.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" className="fill-blue-100" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <a
          href="/signup"
          className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          {ctaLabel}
        </a>
        <a
          href="/login"
          className="inline-flex h-11 items-center rounded-lg border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98]"
        >
          Already have an account? Go to Settings
        </a>
      </div>

      <div className="mt-16">
        <h2 className="text-base font-semibold text-zinc-900">{platform} connection questions</h2>
        <div className="mt-4 flex flex-col gap-5">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-sm font-semibold text-zinc-900">{faq.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
