"use client";
import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

export function SettingsDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
