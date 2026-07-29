"use client";
import { useState } from "react";

export function ProductThumbnail({
  imageUrl,
  alt,
  size = 44,
}: {
  imageUrl: string | null;
  alt: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-panel text-faint"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="9" r="1.5" fill="currentColor" />
          <path d="M4 14l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-lg border border-line object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
