"use client";
import { PopoverMenu } from "./ui/PopoverMenu";

export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
}) {
  function toggle(value: T) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <PopoverMenu
      trigger={({ toggle: toggleOpen }) => (
        <button type="button" onClick={toggleOpen} className="btn btn-ghost text-xs">
          + {label}
          {selected.size > 0 ? ` (${selected.size})` : ""}
        </button>
      )}
    >
      {() => (
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm text-ink hover:bg-panel"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => toggle(opt.value)}
                className="size-4 accent-[var(--accent)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
}
