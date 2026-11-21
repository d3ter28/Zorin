"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react";

const links = [
  { label: "Articles", href: "/blog" },
  { label: "Research", href: "/research" },
  { label: "Tools", href: "/#tools" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            Z
          </span>
          Zorin
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              {l.label}
            </a>
          ))}
        </div>


        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav-menu" className="border-t border-zinc-200/60 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-600"
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
