"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  Plug,
  Radio,
  Settings,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

const NAV_ITEMS = [
  { href: "/meetings", label: "Meetings", icon: Home },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/live-notetaker", label: "Live Notetaker", icon: Radio },
  { href: "/team", label: "Team", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--color-brand-600)" />
      <circle cx="32" cy="26" r="8" fill="#ffffff" />
      <circle cx="32" cy="26" r="3" fill="var(--color-brand-600)" />
      <path
        d="M32 34c-6 0-10 4-10 9s4 8 10 8 10-3 10-8-4-9-10-9z"
        fill="#ffffff"
        opacity="0.85"
      />
    </svg>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "text-white"
          : "text-[color:var(--sidebar-fg-muted)] hover:bg-white/5 hover:text-[color:var(--sidebar-fg)]"
      }`}
      style={isActive ? { background: "var(--sidebar-active-bg)" } : undefined}
    >
      <span
        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full transition-opacity"
        style={{
          background: "var(--sidebar-accent)",
          opacity: isActive ? 1 : 0,
        }}
      />
      <Icon size={18} />
      {label}
    </Link>
  );
}

export function Sidebar({
  onOpenNewMeeting,
  onNavigate,
}: {
  onOpenNewMeeting: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-60 shrink-0 flex-col border-r"
      style={{
        background:
          "linear-gradient(180deg, var(--sidebar-from), var(--sidebar-to))",
        borderColor: "var(--sidebar-border)",
      }}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <LogoMark />
        <span className="text-sm font-semibold tracking-tight text-white">
          MeetMind
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={!!pathname?.startsWith(item.href)}
            onClick={onNavigate}
          />
        ))}

        <div className="mt-auto" />

        <NavLink
          href="/settings"
          label="Settings"
          icon={Settings}
          isActive={!!pathname?.startsWith("/settings")}
          onClick={onNavigate}
        />
      </nav>

      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Avatar name="Demo User" size="sm" />
        <span className="text-sm font-medium text-white">Demo User</span>
      </div>
    </aside>
  );
}
