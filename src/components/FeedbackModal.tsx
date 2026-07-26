"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-line rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-ink transition-colors"
        >
          <X size={18} />
        </button>

        {status === "done" ? (
          <div className="text-center py-6">
            <p className="text-lg font-semibold text-ink mb-1">Thanks for the feedback!</p>
            <p className="text-sm text-muted">We read every submission and use it to improve Zorin.</p>
            <button
              onClick={onClose}
              className="mt-5 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-base font-semibold text-ink mb-1">Share feedback</h2>
            <p className="text-sm text-muted mb-4">
              What's working, what's not, or anything you'd like to see — we read it all.
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your thoughts..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-lg border border-line bg-surface text-ink text-sm p-3 resize-none placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-muted text-right mt-1">{message.length}/2000</p>

            {status === "error" && (
              <p className="text-sm text-red-500 mt-2">Something went wrong — please try again.</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || status === "submitting"}
                className="px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {status === "submitting" ? "Sending…" : "Send feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
