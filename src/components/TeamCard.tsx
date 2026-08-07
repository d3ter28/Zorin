"use client";

import { useEffect, useState } from "react";

interface Member {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

export function TeamCard({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const isOwner = currentUserRole === "OWNER";

  const [members, setMembers] = useState<Member[] | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setPendingInvites(data.pendingInvites);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const email = inviteEmail.trim();
    if (email === "") {
      setError("Enter an email address.");
      return;
    }
    setBusyId("invite");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to send invite");
      }
      setInviteEmail("");
      setShowInviteForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId: string) {
    setError(null);
    setBusyId(userId);
    try {
      const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to remove member");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setBusyId(null);
    }
  }

  async function leaveTeam() {
    setError(null);
    setBusyId(currentUserId);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to leave team");
      }
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave team");
      setBusyId(null);
    }
  }

  async function resendInvite(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invitations/${id}/resend`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to resend invite");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend invite");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to revoke invite");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke invite");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Team</h2>
        {isOwner && (
          <button onClick={() => setShowInviteForm((v) => !v)} className="btn btn-ghost text-xs">
            {showInviteForm ? "Cancel" : "Invite teammate"}
          </button>
        )}
      </div>

      {isOwner && showInviteForm && (
        <form onSubmit={sendInvite} className="mt-3 flex items-end gap-2">
          <label className="flex-1 text-xs font-medium text-muted">
            Email
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="field mt-1 w-full"
              placeholder="teammate@example.com"
            />
          </label>
          <button type="submit" disabled={busyId === "invite"} className="btn btn-primary text-xs">
            {busyId === "invite" ? "Sending..." : "Send invite"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 divide-y divide-line">
        {(members ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="text-ink">{m.email}</span>
              <p className="text-xs text-faint">
                {m.role === "OWNER" ? "Owner" : "Member"} · joined {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </div>
            {isOwner && m.role !== "OWNER" && (
              <button
                onClick={() => removeMember(m.id)}
                disabled={busyId === m.id}
                aria-label={`Remove ${m.email}`}
                className="text-xs text-faint hover:text-danger"
              >
                {busyId === m.id ? "Removing..." : "Remove"}
              </button>
            )}
            {!isOwner && m.id === currentUserId && (
              <button
                onClick={leaveTeam}
                disabled={busyId === currentUserId}
                className="text-xs text-faint hover:text-danger"
              >
                {busyId === currentUserId ? "Leaving..." : "Leave team"}
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && pendingInvites.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Pending invites</h3>
          <div className="mt-2 divide-y divide-line">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-ink">{inv.email}</span>
                  <p className="text-xs text-faint">
                    Invited {new Date(inv.createdAt).toLocaleDateString()} · {inv.expired ? "Expired" : "Pending"}
                  </p>
                </div>
                <button
                  onClick={() => resendInvite(inv.id)}
                  disabled={busyId === inv.id}
                  aria-label={`Resend invite to ${inv.email}`}
                  className="text-xs text-faint hover:text-ink"
                >
                  Resend
                </button>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  disabled={busyId === inv.id}
                  aria-label={`Revoke invite to ${inv.email}`}
                  className="text-xs text-faint hover:text-danger"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
