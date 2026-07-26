"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

const INTERVAL = 4000;

function PanelCatalog() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50">
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Catalog overview</p>
        <p className="mt-1 text-lg font-bold text-zinc-900">14 products analyzed</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-100">
        {[
          { label: "Avg profit lift", value: "+14.2%", color: "text-emerald-600" },
          { label: "Ready to apply", value: "9", color: "text-blue-600" },
          { label: "Need more data", value: "2", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 p-4">
            <span className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-[11px] leading-tight text-zinc-400">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="divide-y divide-zinc-50">
        {[
          { name: "Wireless Earbuds Pro", lift: "+18.3%", status: "bg-emerald-400" },
          { name: "Leather Wallet Slim", lift: "+9.4%", status: "bg-emerald-400" },
          { name: "Bamboo Desk Set", lift: "+6.1%", status: "bg-emerald-400" },
          { name: "Canvas Tote Bag", lift: "—", status: "bg-amber-300" },
        ].map((p) => (
          <div key={p.name} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className={`h-1.5 w-1.5 rounded-full ${p.status}`} />
              <span className="text-sm text-zinc-700">{p.name}</span>
            </div>
            <span className={`font-mono text-sm font-semibold ${p.lift === "—" ? "text-zinc-300" : "text-emerald-600"}`}>
              {p.lift}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelElasticity() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50">
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Model result</p>
        <p className="mt-0.5 text-sm font-medium text-zinc-700">Ceramic Pour-Over Set · SKU-0042</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-400">Price elasticity</p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-zinc-900">−0.74</p>
          </div>
          <span className="mb-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Inelastic
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
            <span>Elastic (price-sensitive)</span>
            <span>Inelastic</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="absolute inset-y-0 left-0 w-[63%] rounded-full bg-gradient-to-r from-blue-300 to-blue-500" />
            <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-zinc-800" style={{ left: "63%" }} />
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-blue-800">
            A 10% price increase is expected to reduce volume by only <strong>7.4%</strong> — your margin gain more than offsets the volume loss.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm">
          <span className="text-zinc-400">Model fit (R²)</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full w-[83%] rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono text-xs font-semibold text-zinc-700">0.83</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelRecommendation() {
  const [applied, setApplied] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50">
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Recommendation</p>
        <p className="mt-0.5 text-sm font-medium text-zinc-700">Wireless Earbuds Pro · SKU-2841</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="flex-1 rounded-xl bg-zinc-50 px-4 py-3 text-center">
            <p className="text-[10px] text-zinc-400">Current price</p>
            <p className="mt-1 font-mono text-2xl font-bold text-zinc-400 line-through">$49.99</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-zinc-300">
            <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex-1 rounded-xl bg-blue-50 px-4 py-3 text-center ring-1 ring-blue-200">
            <p className="text-[10px] text-blue-500">Suggested price</p>
            <p className="mt-1 font-mono text-2xl font-bold text-blue-600">$59.99</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-100 px-3 py-2.5">
            <p className="text-[10px] text-zinc-400">Expected profit lift</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-emerald-600">+18.3%</p>
          </div>
          <div className="rounded-xl border border-zinc-100 px-3 py-2.5">
            <p className="text-[10px] text-zinc-400">Volume change est.</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-zinc-700">−7.4%</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-[87%] rounded-full bg-blue-500" />
          </div>
          <span className="shrink-0 font-mono text-xs text-zinc-500">87% confidence</span>
        </div>
        <button
          onClick={() => setApplied(true)}
          className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            applied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
          }`}
        >
          {applied ? "Price applied ✓" : "Apply recommendation"}
        </button>
      </div>
    </div>
  );
}

const panels = [
  { label: "Catalog", component: <PanelCatalog /> },
  { label: "Model", component: <PanelElasticity /> },
  { label: "Recommendation", component: <PanelRecommendation /> },
];

const captions = [
  "See every product's profit potential at a glance.",
  "Understand exactly how price-sensitive your customers are.",
  "One click to apply a data-backed price change.",
];

export default function SignupPage() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => { setActive((a) => (a + 1) % panels.length); setFading(false); }, 220);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  function goTo(i: number) {
    if (i === active) return;
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 220);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left panel */}
      <div className="flex w-full flex-col justify-between overflow-y-auto px-8 py-10 sm:px-12 md:w-[42%] lg:px-16">
        <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            Z
          </span>
          Zorin
        </a>

        <div className="mx-auto w-full max-w-sm py-10">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Free while in early access. No credit card needed.</p>

          <div className="mt-8">
            <AuthForm
              endpoint="/api/auth/signup"
              submitLabel="Create account"
              fields={[
                { name: "email", label: "Email", type: "email", placeholder: "you@store.com" },
                { name: "password", label: "Password (8+ characters)", type: "password" },
                { name: "storeName", label: "Store name", type: "text" },
                { name: "storeUrl", label: "Store URL (optional)", type: "url", required: false },
              ]}
            />
          </div>

          <p className="mt-5 text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>

        <p className="text-xs text-zinc-400">
          &copy; {new Date().getFullYear()} Zorin. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-slate-50 md:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-100 opacity-50 blur-3xl" />

        <div className="relative z-10 w-full max-w-md px-8">
          <div className="mb-5 flex gap-2">
            {panels.map((p, i) => (
              <button
                key={p.label}
                onClick={() => goTo(i)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                  i === active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:text-zinc-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div
            style={{
              opacity: fading ? 0 : 1,
              transform: fading ? "translateY(8px)" : "translateY(0)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            {panels[active].component}
          </div>

          <p
            className="mt-4 text-center text-xs text-zinc-400"
            style={{ opacity: fading ? 0 : 1, transition: "opacity 0.22s ease" }}
          >
            {captions[active]}
          </p>
        </div>
      </div>
    </div>
  );
}
