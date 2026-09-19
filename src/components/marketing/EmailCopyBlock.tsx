"use client";

import { useState } from "react";

export function EmailCopyBlock({
  subject,
  paragraphs,
}: {
  subject: string;
  paragraphs: string[];
}) {
  const [copied, setCopied] = useState(false);
  const fullText = `Subject: ${subject}\n\n${paragraphs.join("\n\n")}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText);
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
      <p className="pr-16 text-sm font-semibold text-zinc-900">Subject: {subject}</p>
      <div className="mt-4 space-y-3 pr-16 text-sm leading-relaxed text-zinc-700">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
