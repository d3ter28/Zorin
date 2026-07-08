"use client";
import React from "react";

export function LogoutButton({
  className,
  icon,
  children,
  ...rest
}: {
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className={className ?? "text-sm text-muted underline hover:text-ink"}
      {...rest}
    >
      {icon}
      {children ?? "Log out"}
    </button>
  );
}
