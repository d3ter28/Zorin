"use client";
import { useCallback, useEffect, useState } from "react";

interface RecResponse {
  decision: {
    action: string;
    suggestedPrice: number;
    signals: { competitorCount: number; oldestObservedAt: string | null };
  };
  phrasing: string;
}

export function RecommendationCard({ productId }: { productId: string }) {
  const [data, setData] = useState<RecResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/products/${productId}/recommendation`, {
      method: "POST",
    });
    setData(await res.json());
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    generate();
  }, [generate]);

  if (loading && !data) return <div className="rounded border p-4">Analyzing…</div>;
  if (!data) return null;

  const freshness =
    data.decision.signals.competitorCount > 0
      ? `Based on ${data.decision.signals.competitorCount} competitor${
          data.decision.signals.competitorCount === 1 ? "" : "s"
        }`
      : "No competitor data";

  return (
    <div className="rounded border p-4">
      <div className="mb-1 text-xs uppercase text-gray-400">
        Recommendation · {data.decision.action}
      </div>
      <p className="mb-2">{data.phrasing}</p>
      <div className="text-xs text-gray-500">{freshness}</div>
      <button
        className="mt-3 rounded bg-black px-3 py-1 text-sm text-white"
        disabled={loading}
        onClick={generate}
      >
        {loading ? "Regenerating…" : "Regenerate"}
      </button>
    </div>
  );
}
