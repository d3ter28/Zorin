"use client";
import { useState } from "react";

type Mode = "saved" | "open" | "both";

interface Candidate {
  url: string;
  domain: string;
  title: string;
  priceCents: number;
}

interface ReviewCandidate extends Candidate {
  name: string;
  selected: boolean;
}

type State =
  | { phase: "idle" }
  | { phase: "busy" }
  | { phase: "review"; candidates: ReviewCandidate[]; skippedCount: number }
  | { phase: "empty" }
  | { phase: "providerError" }
  | { phase: "noProvider" };

export function DiscoverCompetitors({
  productId,
}: {
  productId: string;
  currentPriceCents: number;
}) {
  const [mode, setMode] = useState<Mode>("both");
  const [state, setState] = useState<State>({ phase: "idle" });

  async function handleDiscover() {
    setState({ phase: "busy" });
    const res = await fetch(`/api/products/${productId}/discover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (res.status === 503) {
      setState({ phase: "noProvider" });
      return;
    }
    const data = await res.json();
    if (data.providerError) {
      setState({ phase: "providerError" });
      return;
    }
    if (!data.candidates || data.candidates.length === 0) {
      setState({ phase: "empty" });
      return;
    }
    setState({
      phase: "review",
      candidates: (data.candidates as Candidate[]).map((c) => ({
        ...c,
        name: c.domain,
        selected: true,
      })),
      skippedCount: data.skipped?.length ?? 0,
    });
  }

  async function handleConfirm() {
    if (state.phase !== "review") return;
    const selected = state.candidates.filter((c) => c.selected);
    await fetch(`/api/products/${productId}/competitors`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        candidates: selected.map((c) => ({
          url: c.url,
          competitorName: c.name,
          priceCents: c.priceCents,
        })),
      }),
    });
    window.location.reload();
  }

  if (state.phase === "noProvider") {
    return (
      <p className="text-sm text-gray-500">
        Competitor discovery requires a search API key (BRAVE_SEARCH_API_KEY).
      </p>
    );
  }

  if (state.phase === "busy") {
    return <p className="text-sm text-gray-500">Searching…</p>;
  }

  if (state.phase === "providerError") {
    return (
      <div>
        <p className="text-sm text-red-600">Search failed — try again.</p>
        <button onClick={() => setState({ phase: "idle" })}>Back</button>
      </div>
    );
  }

  if (state.phase === "empty") {
    return (
      <div>
        <p className="text-sm text-gray-500">
          No competitors found with a confirmed price.
        </p>
        <button onClick={() => setState({ phase: "idle" })}>Back</button>
      </div>
    );
  }

  if (state.phase === "review") {
    const { candidates, skippedCount } = state;
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Discovered competitors</h2>
        {skippedCount > 0 && (
          <p className="mt-2 text-sm text-muted">
            {skippedCount} results could not be verified.
          </p>
        )}
        <ul className="mt-3 divide-y divide-line text-sm">
          {candidates.map((c, i) => (
            <li key={c.url} className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={c.selected}
                onChange={(e) =>
                  setState({
                    ...state,
                    candidates: candidates.map((x, j) =>
                      j === i ? { ...x, selected: e.target.checked } : x,
                    ),
                  })
                }
              />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={c.name}
                  aria-label="competitor name"
                  className="w-full rounded border border-line bg-surface px-2 py-0.5 text-sm text-ink"
                  onChange={(e) =>
                    setState({
                      ...state,
                      candidates: candidates.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
                <span className="text-faint text-xs">{c.domain}</span>
                {" · "}
                <span className="text-faint text-xs">{c.title}</span>
              </div>
              <span className="tabular text-ink">
                ${(c.priceCents / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={handleConfirm}>
            Add selected
          </button>
          <button className="btn btn-ghost" onClick={() => setState({ phase: "idle" })}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Discover competitors</h2>
      <p className="mt-1 text-sm text-muted">
        Search for competitor listings automatically.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          aria-label="search mode"
          className="rounded border border-line bg-surface px-2 py-1 text-sm text-ink"
        >
          <option value="both">Saved + Web</option>
          <option value="saved">Saved list only</option>
          <option value="open">Web search</option>
        </select>
        <button className="btn btn-primary" onClick={handleDiscover}>
          Find competitors
        </button>
      </div>
    </div>
  );
}
