"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Dropdown } from "@/components/ui/Dropdown";
import { formatDate, formatDuration } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

export function MeetingRow({
  meeting,
  onEdit,
  onDelete,
}: {
  meeting: MeetingListItem;
  onEdit: (meeting: MeetingListItem) => void;
  onDelete: (meeting: MeetingListItem) => void;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm">
      <Link
        href={`/meetings/${meeting.id}`}
        className="flex min-w-0 flex-1 flex-col gap-1.5"
      >
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {meeting.title}
          </h3>
          {meeting.open_action_items > 0 && (
            <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              {meeting.open_action_items} open
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{formatDate(meeting.date)}</span>
          <span>&middot;</span>
          <span>{formatDuration(meeting.duration_sec)}</span>
        </div>
        {meeting.summary_snippet && (
          <p className="truncate text-sm text-muted">
            {meeting.summary_snippet}
          </p>
        )}
      </Link>

      <AvatarStack participants={meeting.participants} />

      <Dropdown
        align="right"
        trigger={
          <button
            aria-label="Meeting actions"
            className="rounded-md p-1.5 text-muted hover:bg-black/5"
          >
            <MoreVertical size={18} />
          </button>
        }
        options={[
          { key: "edit", label: "Edit", onSelect: () => onEdit(meeting) },
          {
            key: "delete",
            label: "Delete",
            danger: true,
            onSelect: () => onDelete(meeting),
          },
        ]}
      />
    </div>
  );
}
