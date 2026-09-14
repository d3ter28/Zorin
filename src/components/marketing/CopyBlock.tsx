"use client";

import { useState } from "react";

export function CopyBlock({ text, lines }: { text: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-zinc-50 p-5">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <ol className="space-y-3 pr-16 text-sm leading-relaxed text-zinc-700">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-medium text-zinc-400">{i + 1}.</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
