"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { OverviewTab } from "./OverviewTab";
import { ActionItemsTab } from "./ActionItemsTab";
import { OutlineTab } from "./OutlineTab";
import type { ActionItem, MeetingDetail } from "@/lib/types";

export function NotesPanel({
  meeting,
  currentTime,
  onSeek,
  onActionItemsChange,
}: {
  meeting: MeetingDetail;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onActionItemsChange: (items: ActionItem[]) => void;
}) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "action-items", label: "Action Items" },
          { key: "outline", label: "Outline" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="flex-1 overflow-y-auto">
        {tab === "overview" && <OverviewTab summary={meeting.summary} />}
        {tab === "action-items" && (
          <ActionItemsTab
            meetingId={meeting.id}
            actionItems={meeting.action_items}
            participants={meeting.participants}
            onChange={onActionItemsChange}
            onSeek={onSeek}
          />
        )}
        {tab === "outline" && (
          <OutlineTab
            chapters={meeting.chapters}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        )}
      </div>
    </div>
  );
}
