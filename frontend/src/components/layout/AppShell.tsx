"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NewMeetingModal } from "@/components/meetings/NewMeetingModal";

export function AppShell({ children }: { children: ReactNode }) {
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div className="hidden md:block">
        <Sidebar onOpenNewMeeting={() => setNewMeetingOpen(true)} />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative h-full">
            <Sidebar
              onOpenNewMeeting={() => setNewMeetingOpen(true)}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenNewMeeting={() => setNewMeetingOpen(true)}
          onToggleSidebar={() => setMobileSidebarOpen((o) => !o)}
        />
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>

      <NewMeetingModal
        open={newMeetingOpen}
        onClose={() => setNewMeetingOpen(false)}
      />
    </div>
  );
}
