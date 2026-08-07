"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface InviteInfo {
  merchantName: string;
  email: string;
}

type Status = "loading" | "not-found" | "ready" | "submitting" | "done";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [status, setStatus] = useState<Status>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (cancelled) return;
        if (!res.ok) {
          setStatus("not-found");
          return;
        }
        const data = (await res.json()) as InviteInfo;
        setInvite(data);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("not-found");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        setStatus("ready");
        return;
      }
      setStatus("done");
      window.location.href = "/dashboard";
    } catch {
      setErrorMessage("Network error — please try again.");
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Loading invite...
        </p>
      </main>
    );
  }

  if (status === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">Invite not found</h1>
          <p className="mt-2 text-sm text-muted">
            This invite link is invalid or has expired. Ask whoever invited you to send a new one.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Redirecting...
        </p>
      </main>
    );
  }

  const submitting = status === "submitting";

  return (
    <main className="flex min-h-screen justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Team invite</p>
          <h1 className="mt-1 text-lg font-semibold text-ink">Join {invite?.merchantName} on Zorin</h1>
          <p className="mt-2 text-sm text-muted">
            Set a password for {invite?.email} to finish joining.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-muted">Password (8+ characters)</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-1 w-full"
                disabled={submitting}
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Confirm password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field mt-1 w-full"
                disabled={submitting}
              />
            </label>

            {errorMessage && (
              <p role="alert" className="text-sm text-danger">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              <span role="status" aria-live="polite">
                {submitting ? "Joining..." : "Join team"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
