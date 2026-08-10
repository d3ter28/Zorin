"use client";
import { PopoverMenu } from "./ui/PopoverMenu";

export interface ColumnVisibility {
  role: boolean;
  status: boolean;
  date: boolean;
}

const COLUMNS: { key: keyof ColumnVisibility; label: string }[] = [
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "date", label: "Joined" },
];

export function ColumnVisibilityMenu({
  visibility,
  onChange,
}: {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
}) {
  return (
    <PopoverMenu
      align="right"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="btn btn-ghost text-xs">
          View
        </button>
      )}
    >
      {() => (
        <div className="space-y-1">
          {COLUMNS.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-panel"
            >
              <input
                type="checkbox"
                checked={visibility[col.key]}
                onChange={() => onChange({ ...visibility, [col.key]: !visibility[col.key] })}
                className="size-4 accent-[var(--accent)]"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
}
