"use client";

import { Download } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { formatDate, formatTime } from "@/lib/format";
import type { MeetingDetail, Segment } from "@/lib/types";

function buildMarkdown(meeting: MeetingDetail, segments: Segment[]): string {
  const lines: string[] = [];
  lines.push(`# ${meeting.title}`);
  lines.push("");
  lines.push(`${formatDate(meeting.date)}`);
  lines.push(`Participants: ${meeting.participants.map((p) => p.name).join(", ") || "None"}`);
  lines.push("");

  if (meeting.summary) {
    lines.push("## Overview");
    lines.push(meeting.summary.overview);
    lines.push("");
    lines.push(`Keywords: ${meeting.summary.keywords.join(", ")}`);
    lines.push("");
  }

  if (meeting.chapters.length > 0) {
    lines.push("## Outline");
    for (const c of meeting.chapters) {
      lines.push(`- [${formatTime(c.start_sec)}] ${c.title}`);
    }
    lines.push("");
  }

  if (meeting.action_items.length > 0) {
    lines.push("## Action Items");
    for (const a of meeting.action_items) {
      const box = a.completed ? "[x]" : "[ ]";
      const assignee = a.assignee ? ` (${a.assignee.name})` : "";
      lines.push(`- ${box} ${a.text}${assignee}`);
    }
    lines.push("");
  }

  lines.push("## Transcript");
  for (const s of segments) {
    lines.push(`**[${formatTime(s.start_sec)}] ${s.speaker_label}:** ${s.text}`);
  }

  return lines.join("\n");
}

function buildTxt(meeting: MeetingDetail, segments: Segment[]): string {
  const lines: string[] = [];
  lines.push(meeting.title);
  lines.push(formatDate(meeting.date));
  lines.push("");
  for (const s of segments) {
    lines.push(`[${formatTime(s.start_sec)}] ${s.speaker_label}: ${s.text}`);
  }
  return lines.join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  meeting,
  segments,
}: {
  meeting: MeetingDetail;
  segments: Segment[];
}) {
  const slug = meeting.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <Dropdown
      align="right"
      trigger={
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-brand-50">
          <Download size={16} />
          Export
        </button>
      }
      options={[
        {
          key: "md",
          label: "Markdown (.md)",
          onSelect: () => download(`${slug}.md`, buildMarkdown(meeting, segments)),
        },
        {
          key: "txt",
          label: "Plain text (.txt)",
          onSelect: () => download(`${slug}.txt`, buildTxt(meeting, segments)),
        },
      ]}
    />
  );
}
