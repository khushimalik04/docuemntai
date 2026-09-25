import { formatTime } from "@/lib/format";
import type { Chapter } from "@/lib/types";

export function OutlineTab({
  chapters,
  currentTime,
  onSeek,
}: {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}) {
  if (chapters.length === 0) {
    return <p className="p-4 text-sm text-muted">No chapters yet.</p>;
  }

  let currentChapterId: number | null = null;
  for (const c of chapters) {
    if (c.start_sec <= currentTime) currentChapterId = c.id;
    else break;
  }

  return (
    <div className="space-y-1 p-3">
      {chapters.map((c) => {
        const isActive = c.id === currentChapterId;
        return (
          <button
            key={c.id}
            onClick={() => onSeek(c.start_sec)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              isActive ? "bg-brand-50 text-brand-700" : "hover:bg-black/[0.03]"
            }`}
          >
            <span className="w-14 shrink-0 tabular-nums text-xs text-muted">
              {formatTime(c.start_sec)}
            </span>
            <span className="truncate font-medium">{c.title}</span>
          </button>
        );
      })}
    </div>
  );
}
