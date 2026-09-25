"use client";

import { forwardRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatTime } from "@/lib/format";
import type { Segment } from "@/lib/types";

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const TranscriptLine = forwardRef<
  HTMLDivElement,
  {
    segment: Segment;
    isActive: boolean;
    query: string;
    isCurrentMatch: boolean;
    onSeek: (seconds: number) => void;
  }
>(function TranscriptLine({ segment, isActive, query, isCurrentMatch, onSeek }, ref) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "true" : undefined}
      data-segment-id={segment.id}
      onClick={() => onSeek(segment.start_sec)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeek(segment.start_sec);
        }
      }}
      className={`flex cursor-pointer gap-3 rounded-lg p-2.5 transition-colors ${
        isActive ? "bg-brand-50" : "hover:bg-black/[0.03]"
      } ${isCurrentMatch ? "ring-2 ring-brand-400" : ""}`}
    >
      <Avatar name={segment.speaker_label} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{segment.speaker_label}</span>
          <span className="text-xs tabular-nums text-muted">
            {formatTime(segment.start_sec)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {highlight(segment.text, query)}
        </p>
      </div>
    </div>
  );
});
