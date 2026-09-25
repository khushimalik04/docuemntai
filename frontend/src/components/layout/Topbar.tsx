"use client";

import { Bell, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function Topbar({
  onOpenNewMeeting,
  onToggleSidebar,
}: {
  onOpenNewMeeting: () => void;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="rounded-md p-1.5 text-muted hover:bg-black/5 md:hidden"
      >
        <Menu size={20} />
      </button>

      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings and transcripts"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="primary" onClick={onOpenNewMeeting}>
          New meeting
        </Button>
        <button
          onClick={() => toast("Notifications are coming soon")}
          aria-label="Notifications"
          className="rounded-full p-2 text-muted hover:bg-black/5"
        >
          <Bell size={18} />
        </button>
        <Avatar name="Demo User" size="sm" />
      </div>
    </header>
  );
}
