export type RowStatus = "Active" | "Invited" | "Expired";
export type RowRole = "OWNER" | "MEMBER";

export interface TeamRow {
  id: string;
  email: string;
  role: RowRole;
  status: RowStatus;
  date: string;
  kind: "member" | "invite";
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface TeamPendingInvite {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

export function normalizeTeamRows(members: TeamMember[], pendingInvites: TeamPendingInvite[]): TeamRow[] {
  const memberRows: TeamRow[] = members.map((m) => ({
    id: m.id,
    email: m.email,
    role: m.role === "OWNER" ? "OWNER" : "MEMBER",
    status: "Active",
    date: m.createdAt,
    kind: "member",
  }));
  const inviteRows: TeamRow[] = pendingInvites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: "MEMBER",
    status: inv.expired ? "Expired" : "Invited",
    date: inv.createdAt,
    kind: "invite",
  }));
  return [...memberRows, ...inviteRows];
}

export interface TeamRowFilters {
  emailQuery: string;
  statuses: Set<RowStatus>;
  roles: Set<RowRole>;
}

export function filterTeamRows(rows: TeamRow[], filters: TeamRowFilters): TeamRow[] {
  const query = filters.emailQuery.trim().toLowerCase();
  return rows.filter((row) => {
    if (query !== "" && !row.email.toLowerCase().includes(query)) return false;
    if (filters.statuses.size > 0 && !filters.statuses.has(row.status)) return false;
    if (filters.roles.size > 0 && !filters.roles.has(row.role)) return false;
    return true;
  });
}

export type SortField = "email" | "date";
export type SortDirection = "asc" | "desc";

export function sortTeamRows(rows: TeamRow[], field: SortField, direction: SortDirection): TeamRow[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (field === "email") return a.email.localeCompare(b.email) * multiplier;
    return (new Date(a.date).getTime() - new Date(b.date).getTime()) * multiplier;
  });
}

/** A row is removable via bulk-remove unless it's the account Owner's own member row. */
export function removableRowIds(rows: TeamRow[], selected: Set<string>): string[] {
  return [...selected].filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row !== undefined && !(row.kind === "member" && row.role === "OWNER");
  });
}

export interface RemovalResult {
  email: string;
  ok: boolean;
  error?: string;
}

/** Formats per-row bulk-remove failures into one message; null when everything succeeded. */
export function summarizeRemovalFailures(results: RemovalResult[]): string | null {
  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) return null;
  return `Some removals failed:\n${failures.map((f) => `${f.email}: ${f.error ?? "failed"}`).join("\n")}`;
}
