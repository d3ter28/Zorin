"use client";
import { DotsThree } from "@phosphor-icons/react";
import { PopoverMenu } from "./ui/PopoverMenu";

export interface RowAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null;

  return (
    <PopoverMenu
      align="right"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Row actions"
          className="rounded p-1 text-faint hover:bg-panel hover:text-ink"
        >
          <DotsThree size={18} weight="bold" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="space-y-0.5">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                a.onClick();
                close();
              }}
              className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-panel disabled:opacity-50 ${
                a.danger ? "text-danger" : "text-ink"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
}
