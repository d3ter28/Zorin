"use client";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  merchantName,
}: {
  children: React.ReactNode;
  merchantName?: string;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar merchantName={merchantName} />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
