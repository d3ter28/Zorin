"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Gear, SignOut } from "@phosphor-icons/react";
import { LogoutButton } from "./LogoutButton";

const SIDEBAR_BG = "oklch(0.18 0.012 265)";
const ITEM_TEXT = "oklch(0.62 0.010 265)";
const ITEM_HOVER_BG = "oklch(0.26 0.012 265)";
const ITEM_HOVER_TEXT = "oklch(0.88 0.005 265)";
const DIVIDER = "oklch(0.28 0.012 265)";
const BRAND_TEXT = "oklch(0.95 0.003 265)";
const MERCHANT_TEXT = "oklch(0.50 0.010 265)";

const NAV = [
  { href: "/dashboard", icon: SquaresFour, label: "Dashboard", matchPrefix: ["/dashboard", "/product"] },
  { href: "/settings", icon: Gear, label: "Settings", matchPrefix: ["/settings"] },
];

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-accent text-accent-fg" : ""
      }`}
      style={active ? undefined : { color: ITEM_TEXT }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.backgroundColor = ITEM_HOVER_BG;
          (e.currentTarget as HTMLElement).style.color = ITEM_HOVER_TEXT;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.backgroundColor = "";
          (e.currentTarget as HTMLElement).style.color = ITEM_TEXT;
        }
      }}
    >
      <Icon size={16} weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}

export function Sidebar({ merchantName }: { merchantName?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {/* Brand */}
      <div className="px-5 pt-5 pb-6">
        <span className="text-sm font-semibold tracking-tight" style={{ color: BRAND_TEXT }}>
          PriceIQ
        </span>
        {merchantName && (
          <p className="text-xs mt-0.5 truncate" style={{ color: MERCHANT_TEXT }}>
            {merchantName}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, icon, label, matchPrefix }) => (
          <NavItem
            key={href}
            href={href}
            icon={icon}
            label={label}
            active={matchPrefix.some((p) => pathname === p || pathname.startsWith(p + "/"))}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        <LogoutButton
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          icon={<SignOut size={16} />}
          style={{ color: ITEM_TEXT }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = ITEM_HOVER_BG;
            (e.currentTarget as HTMLElement).style.color = ITEM_HOVER_TEXT;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
            (e.currentTarget as HTMLElement).style.color = ITEM_TEXT;
          }}
        />
      </div>
    </aside>
  );
}
