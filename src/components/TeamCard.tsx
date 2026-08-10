"use client";

import { useEffect, useMemo, useState } from "react";
import {
  normalizeTeamRows,
  filterTeamRows,
  sortTeamRows,
  removableRowIds,
  summarizeRemovalFailures,
  actionKindsForRow,
  teamRowEndpoint,
  type TeamRow,
  type RowStatus,
  type RowRole,
  type SortField,
  type SortDirection,
} from "@/lib/team/rows";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { ColumnVisibilityMenu, type ColumnVisibility } from "./ColumnVisibilityMenu";
import { RowActionsMenu } from "./RowActionsMenu";

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

const STATUS_OPTIONS: { value: RowStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Invited", label: "Invited" },
  { value: "Expired", label: "Expired" },
];

const ROLE_OPTIONS: { value: RowRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "MEMBER", label: "Member" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function TeamCard({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const isOwner = currentUserRole === "OWNER";

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [emailQuery, setEmailQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<RowStatus>>(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<RowRole>>(new Set());
  const [sortField, setSortField] = useState<SortField>("email");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibility, setVisibility] = useState<ColumnVisibility>({ role: true, status: true, date: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setPendingInvites(data.pendingInvites);
    }
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => normalizeTeamRows(members, pendingInvites), [members, pendingInvites]);
  const filtered = useMemo(
    () => filterTeamRows(rows, { emailQuery, statuses: statusFilter, roles: roleFilter }),
    [rows, emailQuery, statusFilter, roleFilter],
  );
  const sorted = useMemo(() => sortTeamRows(filtered, sortField, sortDirection), [filtered, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const pageIds = removableRowIds(paged, new Set(paged.map((r) => r.id)));
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

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

  async function removeSelected() {
    const removableIds = removableRowIds(rows, selected);
    if (removableIds.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const results: { email: string; ok: boolean; error?: string }[] = [];
    for (const id of removableIds) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      try {
        const res = await fetch(teamRowEndpoint(row), { method: "DELETE" });
        if (res.ok) {
          results.push({ email: row.email, ok: true });
        } else {
          const data = await res.json().catch(() => null);
          results.push({ email: row.email, ok: false, error: data?.error });
        }
      } catch {
        results.push({ email: row.email, ok: false, error: "network error" });
      }
    }
    setSelected(new Set());
    setBulkBusy(false);
    const summary = summarizeRemovalFailures(results);
    if (summary) setError(summary);
    await refresh();
  }

  function actionsForRow(row: TeamRow) {
    const kinds = actionKindsForRow(row, { isOwner, currentUserId });
    return kinds.map((kind) => {
      switch (kind) {
        case "remove":
          return { label: "Remove", onClick: () => removeMember(row.id), danger: true, disabled: busyId === row.id };
        case "resend":
          return { label: "Resend", onClick: () => resendInvite(row.id), disabled: busyId === row.id };
        case "revoke":
          return { label: "Revoke", onClick: () => revokeInvite(row.id), danger: true, disabled: busyId === row.id };
        case "leave":
          return { label: "Leave team", onClick: leaveTeam, danger: true, disabled: busyId === currentUserId };
      }
    });
  }

  const pageSelectableIds = removableRowIds(paged, new Set(paged.map((r) => r.id)));
  const allOnPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selected.has(id));
  const selectableCount = removableRowIds(rows, selected).length;

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Team members</h2>
          <p className="mt-0.5 text-xs text-muted">Manage your team members and their roles.</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowInviteForm((v) => !v)} className="btn btn-ghost text-xs">
            {showInviteForm ? "Cancel" : "Invite member"}
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
        <p role="alert" className="mt-3 whitespace-pre-line text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={emailQuery}
          onChange={(e) => {
            setEmailQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by email..."
          className="field w-56 text-sm"
        />
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={(next) => {
            setStatusFilter(next);
            setPage(1);
          }}
        />
        <MultiSelectFilter
          label="Role"
          options={ROLE_OPTIONS}
          selected={roleFilter}
          onChange={(next) => {
            setRoleFilter(next);
            setPage(1);
          }}
        />
        <div className="ml-auto">
          <ColumnVisibilityMenu visibility={visibility} onChange={setVisibility} />
        </div>
      </div>

      {isOwner && selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-panel px-3 py-2">
          <span className="text-xs text-muted">{selected.size} selected</span>
          <button
            onClick={removeSelected}
            disabled={bulkBusy || selectableCount === 0}
            className="btn btn-ghost text-xs text-danger"
          >
            {bulkBusy ? "Removing..." : `Remove selected (${selectableCount})`}
          </button>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wide text-muted">
              {isOwner && (
                <th scope="col" className="w-8 py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all rows on this page"
                    className="size-4 accent-[var(--accent)]"
                  />
                </th>
              )}
              <th scope="col" className="py-2 pr-3 font-medium">
                <button type="button" onClick={() => toggleSort("email")} className="hover:text-ink">
                  Email {sortField === "email" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              {visibility.role && (
                <th scope="col" className="py-2 pr-3 font-medium">
                  Role
                </th>
              )}
              {visibility.status && (
                <th scope="col" className="py-2 pr-3 font-medium">
                  Status
                </th>
              )}
              {visibility.date && (
                <th scope="col" className="py-2 pr-3 font-medium">
                  <button type="button" onClick={() => toggleSort("date")} className="hover:text-ink">
                    Joined {sortField === "date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              )}
              <th scope="col" className="w-10 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const actions = actionsForRow(row);
              const rowSelectable = isOwner && !(row.kind === "member" && row.role === "OWNER");
              return (
                <tr key={row.id} className="border-b border-line last:border-0">
                  {isOwner && (
                    <td className="py-2 pr-2">
                      {rowSelectable && (
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelected(row.id)}
                          aria-label={`Select ${row.email}`}
                          className="size-4 accent-[var(--accent)]"
                        />
                      )}
                    </td>
                  )}
                  <td className="py-2 pr-3 text-ink">{row.email}</td>
                  {visibility.role && (
                    <td className="py-2 pr-3 text-muted">{row.role === "OWNER" ? "Owner" : "Member"}</td>
                  )}
                  {visibility.status && (
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === "Active"
                            ? "bg-accent-soft text-accent"
                            : row.status === "Expired"
                              ? "bg-panel text-faint"
                              : "bg-panel text-muted"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  )}
                  {visibility.date && (
                    <td className="py-2 pr-3 text-muted">{new Date(row.date).toLocaleDateString()}</td>
                  )}
                  <td className="py-2">
                    <RowActionsMenu actions={actions} />
                  </td>
                </tr>
              );
            })}
            {loaded && paged.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted">
                  No team members match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <label className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="field text-xs"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          Rows per page
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="btn btn-ghost text-xs"
          >
            Previous
          </button>
          <span>
            Page {safePage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            className="btn btn-ghost text-xs"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
