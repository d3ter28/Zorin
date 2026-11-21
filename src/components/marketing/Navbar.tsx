"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react";

const links = [
  { label: "Articles", href: "/blog/all", match: (p: string) => p.startsWith("/blog") && p !== "/blog" },
  { label: "Topics", href: "/blog", match: (p: string) => p === "/blog" },
  { label: "Research", href: "/research", match: (p: string) => p.startsWith("/research") },
  { label: "Tools", href: "/#tools", match: () => false },
  { label: "Glossary", href: "/glossary", match: (p: string) => p.startsWith("/glossary") },
  { label: "About", href: "/about", match: (p: string) => p.startsWith("/about") },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-ink bg-bg">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-8 px-6 md:px-7">
        <a href="/" className="flex items-baseline gap-1.5 text-ink">
          <span className="font-serif text-2xl font-semibold tracking-tight">Zorin</span>
          <span className="font-mono text-[10px] font-medium text-accent">pricing</span>
        </a>

        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => {
            const active = l.match(pathname);
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm transition-colors hover:text-ink ${
                  active ? "font-semibold text-ink" : "text-ink-2"
                }`}
              >
                {l.label}
              </a>
            );
          })}
        </div>

        <span className="ml-auto hidden font-mono text-xs text-faint lg:block">
          Practical pricing guides for online sellers
        </span>

        <button
          onClick={() => setOpen(!open)}
          className="ml-auto flex h-9 w-9 items-center justify-center text-ink-2 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav-menu" className="border-t border-line bg-bg px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink-2"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
