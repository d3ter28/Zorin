import { describe, it, expect } from "vitest";
import {
  normalizeTeamRows,
  filterTeamRows,
  sortTeamRows,
  removableRowIds,
  summarizeRemovalFailures,
  actionKindsForRow,
  teamRowEndpoint,
} from "./rows";

const members = [
  { id: "u1", email: "owner@example.com", role: "OWNER", createdAt: "2026-01-01T00:00:00Z" },
  { id: "u2", email: "member@example.com", role: "MEMBER", createdAt: "2026-02-01T00:00:00Z" },
];

const pendingInvites = [
  {
    id: "i1",
    email: "pending@example.com",
    expiresAt: "2099-01-01T00:00:00Z",
    createdAt: "2026-03-01T00:00:00Z",
    expired: false,
  },
  {
    id: "i2",
    email: "gone@example.com",
    expiresAt: "2020-01-01T00:00:00Z",
    createdAt: "2026-01-15T00:00:00Z",
    expired: true,
  },
];

describe("normalizeTeamRows", () => {
  it("maps members to Active rows and invites to Invited/Expired rows", () => {
    const rows = normalizeTeamRows(members, pendingInvites);
    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.id === "u1")).toMatchObject({ status: "Active", role: "OWNER", kind: "member" });
    expect(rows.find((r) => r.id === "u2")).toMatchObject({ status: "Active", role: "MEMBER", kind: "member" });
    expect(rows.find((r) => r.id === "i1")).toMatchObject({ status: "Invited", role: "MEMBER", kind: "invite" });
    expect(rows.find((r) => r.id === "i2")).toMatchObject({ status: "Expired", role: "MEMBER", kind: "invite" });
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeTeamRows([], [])).toEqual([]);
  });
});

describe("filterTeamRows", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("filters by email substring, case-insensitively", () => {
    const result = filterTeamRows(rows, { emailQuery: "OWNER", statuses: new Set(), roles: new Set() });
    expect(result.map((r) => r.id)).toEqual(["u1"]);
  });

  it("filters by status", () => {
    const result = filterTeamRows(rows, { emailQuery: "", statuses: new Set(["Expired"]), roles: new Set() });
    expect(result.map((r) => r.id)).toEqual(["i2"]);
  });

  it("filters by role", () => {
    const result = filterTeamRows(rows, { emailQuery: "", statuses: new Set(), roles: new Set(["OWNER"]) });
    expect(result.map((r) => r.id)).toEqual(["u1"]);
  });

  it("combines email, status, and role filters with AND logic", () => {
    const result = filterTeamRows(rows, {
      emailQuery: "example.com",
      statuses: new Set(["Active"]),
      roles: new Set(["MEMBER"]),
    });
    expect(result.map((r) => r.id)).toEqual(["u2"]);
  });

  it("returns all rows when no filters are set", () => {
    const result = filterTeamRows(rows, { emailQuery: "", statuses: new Set(), roles: new Set() });
    expect(result).toHaveLength(4);
  });

  it("returns an empty array when every filter dimension excludes all rows", () => {
    const result = filterTeamRows(rows, {
      emailQuery: "nobody-matches-this",
      statuses: new Set(),
      roles: new Set(),
    });
    expect(result).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(filterTeamRows([], { emailQuery: "", statuses: new Set(), roles: new Set() })).toEqual([]);
  });
});

describe("sortTeamRows", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("sorts by email ascending", () => {
    const result = sortTeamRows(rows, "email", "asc");
    expect(result.map((r) => r.email)).toEqual([
      "gone@example.com",
      "member@example.com",
      "owner@example.com",
      "pending@example.com",
    ]);
  });

  it("sorts by date descending", () => {
    const result = sortTeamRows(rows, "date", "desc");
    expect(result.map((r) => r.id)).toEqual(["i1", "u2", "i2", "u1"]);
  });

  it("sorts by email descending", () => {
    const result = sortTeamRows(rows, "email", "desc");
    expect(result.map((r) => r.email)).toEqual([
      "pending@example.com",
      "owner@example.com",
      "member@example.com",
      "gone@example.com",
    ]);
  });

  it("sorts by date ascending", () => {
    const result = sortTeamRows(rows, "date", "asc");
    expect(result.map((r) => r.id)).toEqual(["u1", "i2", "u2", "i1"]);
  });

  it("preserves relative order of tied rows in both asc and desc (email)", () => {
    const tied = normalizeTeamRows(
      [
        { id: "t1", email: "same@example.com", role: "MEMBER", createdAt: "2026-01-01T00:00:00Z" },
        { id: "t2", email: "same@example.com", role: "MEMBER", createdAt: "2026-02-01T00:00:00Z" },
      ],
      [],
    );
    expect(sortTeamRows(tied, "email", "asc").map((r) => r.id)).toEqual(["t1", "t2"]);
    expect(sortTeamRows(tied, "email", "desc").map((r) => r.id)).toEqual(["t1", "t2"]);
  });

  it("preserves relative order of tied rows in both asc and desc (date)", () => {
    const tied = normalizeTeamRows(
      [
        { id: "t1", email: "a@example.com", role: "MEMBER", createdAt: "2026-05-01T00:00:00Z" },
        { id: "t2", email: "b@example.com", role: "MEMBER", createdAt: "2026-05-01T00:00:00Z" },
      ],
      [],
    );
    expect(sortTeamRows(tied, "date", "asc").map((r) => r.id)).toEqual(["t1", "t2"]);
    expect(sortTeamRows(tied, "date", "desc").map((r) => r.id)).toEqual(["t1", "t2"]);
  });
});

describe("removableRowIds", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("excludes the Owner's own member row from a selection", () => {
    const result = removableRowIds(rows, new Set(["u1", "u2", "i1"]));
    expect(result.sort()).toEqual(["i1", "u2"]);
  });

  it("returns an empty array when only the Owner row is selected", () => {
    const result = removableRowIds(rows, new Set(["u1"]));
    expect(result).toEqual([]);
  });

  it("ignores IDs that don't match any row", () => {
    const result = removableRowIds(rows, new Set(["does-not-exist"]));
    expect(result).toEqual([]);
  });
});

describe("summarizeRemovalFailures", () => {
  it("returns null when every result succeeded", () => {
    const result = summarizeRemovalFailures([
      { email: "a@example.com", ok: true },
      { email: "b@example.com", ok: true },
    ]);
    expect(result).toBeNull();
  });

  it("formats only the failed rows into one multi-line message", () => {
    const result = summarizeRemovalFailures([
      { email: "a@example.com", ok: true },
      { email: "b@example.com", ok: false, error: "Not found" },
      { email: "c@example.com", ok: false },
    ]);
    expect(result).toBe(
      "Some removals failed:\nb@example.com: Not found\nc@example.com: failed",
    );
  });
});

describe("actionKindsForRow", () => {
  const rows = normalizeTeamRows(members, pendingInvites);
  const memberRow = rows.find((r) => r.id === "u2")!; // MEMBER row
  const ownerRow = rows.find((r) => r.id === "u1")!; // OWNER row
  const inviteRow = rows.find((r) => r.id === "i1")!;

  it("Owner viewing a Member row -> remove", () => {
    expect(actionKindsForRow(memberRow, { isOwner: true, currentUserId: "u1" })).toEqual(["remove"]);
  });

  it("Owner viewing an invite row -> resend + revoke", () => {
    expect(actionKindsForRow(inviteRow, { isOwner: true, currentUserId: "u1" })).toEqual(["resend", "revoke"]);
  });

  it("Owner viewing an expired invite row -> revoke only, no resend", () => {
    const expiredInviteRow = rows.find((r) => r.id === "i2")!;
    expect(actionKindsForRow(expiredInviteRow, { isOwner: true, currentUserId: "u1" })).toEqual(["revoke"]);
  });

  it("Member viewing their own row -> leave", () => {
    expect(actionKindsForRow(memberRow, { isOwner: false, currentUserId: "u2" })).toEqual(["leave"]);
  });

  it("Owner viewing their own row -> no actions", () => {
    expect(actionKindsForRow(ownerRow, { isOwner: true, currentUserId: "u1" })).toEqual([]);
  });

  it("Member viewing another Member's row -> no actions", () => {
    const otherMemberRow = rows.find((r) => r.id === "u1")!;
    expect(actionKindsForRow(otherMemberRow, { isOwner: false, currentUserId: "u2" })).toEqual([]);
  });

  it("Member viewing an invite row -> no actions", () => {
    expect(actionKindsForRow(inviteRow, { isOwner: false, currentUserId: "u2" })).toEqual([]);
  });
});

describe("teamRowEndpoint", () => {
  const rows = normalizeTeamRows(members, pendingInvites);

  it("returns the member endpoint for a member row", () => {
    const row = rows.find((r) => r.id === "u2")!;
    expect(teamRowEndpoint(row)).toBe("/api/team/u2");
  });

  it("returns the invitation endpoint for an invite row", () => {
    const row = rows.find((r) => r.id === "i1")!;
    expect(teamRowEndpoint(row)).toBe("/api/team/invitations/i1");
  });
});
