"use client";

import { useRef } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface Badge {
  href: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  title?: string;
}

const badges: Badge[] = [
  { href: "https://smollaunch.com", src: "/badges/smollaunch-featured.svg", alt: "Zorin — Featured on Smol Launch", width: 250, height: 60 },
  { href: "https://toolcurio.com", src: "/badges/toolcurio-featured.png", alt: "Zorin — Featured on Toolcurio", width: 200, height: 54 },
  { href: "https://alternative.tools/item/zorin?utm_source=badge&utm_medium=referral&utm_campaign=featured-badge", src: "/badges/alternativetools-featured.svg", alt: "Zorin — Featured on Alternative.tools", width: 200, height: 54 },
  { href: "https://dododirectory.com", src: "/badges/dododirectory-featured.png", alt: "Zorin — Featured on DodoDirectory", width: 200, height: 54 },
  { href: "https://earlyhunt.com/project/zorin", src: "/badges/earlyhunt-featured.svg", alt: "Zorin — Featured on EarlyHunt", width: 265, height: 58 },
  { href: "https://auraplusplus.com/projects/zorin-data-driven-pricing-optimization", src: "/badges/auraplusplus-featured.svg", alt: "Zorin — Featured on Aura++", width: 265, height: 58, title: "View this project on Aura++" },
  { href: "https://turbo0.com/item/zorin", src: "/badges/turbo0-featured.svg", alt: "Zorin — Listed on Turbo0", width: 162, height: 54 },
  { href: "https://twelve.tools", src: "/badges/twelvetools-featured.svg", alt: "Zorin — Featured on Twelve Tools", width: 200, height: 54 },
  { href: "https://dang.ai", src: "/badges/dang-featured.png", alt: "Zorin — Verified on DANG!", width: 260, height: 94 },
  { href: "https://startupfa.me/s/zorin?utm_source=www.tryzorin.com", src: "/badges/startupfame-featured.webp", alt: "Zorin — Featured on Startup Fame", width: 224, height: 36 },
  { href: "https://fazier.com", src: "/badges/fazier-featured.svg", alt: "Zorin — Featured on Fazier", width: 182, height: 43 },
];

export function FeaturedOnBadges() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="mt-12 border-t border-zinc-100 pt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Featured on</p>
      <div className="relative mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-320)}
          aria-label="Scroll badges left"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 sm:flex"
        >
          <CaretLeft size={14} weight="bold" />
        </button>

        <div
          ref={scrollerRef}
          className="flex items-center gap-4 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {badges.map((badge) => (
            <a
              key={badge.href}
              href={badge.href}
              target="_blank"
              rel="noopener"
              title={badge.title}
              className="shrink-0"
            >
              <img
                src={badge.src}
                alt={badge.alt}
                loading="lazy"
                width={badge.width}
                height={badge.height}
                className="h-10 w-auto opacity-90 transition-opacity hover:opacity-100"
              />
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(320)}
          aria-label="Scroll badges right"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 sm:flex"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
