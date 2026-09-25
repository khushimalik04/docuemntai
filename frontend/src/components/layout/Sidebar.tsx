"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  Plug,
  Radio,
  Search,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

const NAV_ITEMS = [
  { href: "/meetings", label: "Meetings", icon: Home },
  { href: "/search", label: "Search", icon: Search },
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

export function Sidebar({
  onOpenNewMeeting,
  onNavigate,
}: {
  onOpenNewMeeting: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <LogoMark />
        <span className="text-sm font-semibold tracking-tight">
          Fireflies Clone
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        <button
          onClick={() => {
            onOpenNewMeeting();
            onNavigate?.();
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          <Upload size={18} />
          Uploads
        </button>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-100 text-brand-700"
                  : "text-muted hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto" />

        <Link
          href="/settings"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname?.startsWith("/settings")
              ? "bg-brand-100 text-brand-700"
              : "text-muted hover:bg-brand-50 hover:text-brand-700"
          }`}
        >
          <Settings size={18} />
          Settings
        </Link>
      </nav>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Avatar name="Demo User" size="sm" />
        <span className="text-sm font-medium">Demo User</span>
      </div>
    </aside>
  );
}
