"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef } from "react";
import type { MouseEvent } from "react";
import { formatTime } from "@/lib/format";
import type { PlaybackSpeed } from "@/hooks/usePlayer";
import type { Chapter } from "@/lib/types";

const SPEEDS: PlaybackSpeed[] = [1, 1.5, 2];

export function MediaPlayer({
  currentTime,
  duration,
  isPlaying,
  speed,
  chapters,
  onToggle,
  onSkip,
  onSeek,
  onSpeedChange,
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  chapters: Chapter[];
  onToggle: () => void;
  onSkip: (delta: number) => void;
  onSeek: (seconds: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function seekFromClientX(clientX: number) {
    const bar = barRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    onSeek(ratio * duration);
  }

  function handleBarMouseDown(e: MouseEvent<HTMLDivElement>) {
    draggingRef.current = true;
    seekFromClientX(e.clientX);
    const onMove = (ev: globalThis.MouseEvent) => {
      if (draggingRef.current) seekFromClientX(ev.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <button
          onClick={() => onSkip(-15)}
          aria-label="Back 15 seconds"
          className="rounded-full p-2 text-muted hover:bg-black/5"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <button
          onClick={() => onSkip(15)}
          aria-label="Forward 15 seconds"
          className="rounded-full p-2 text-muted hover:bg-black/5"
        >
          <RotateCw size={18} />
        </button>

        <span className="w-24 shrink-0 text-xs tabular-nums text-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div
          ref={barRef}
          onMouseDown={handleBarMouseDown}
          className="relative h-2 flex-1 cursor-pointer rounded-full bg-black/10"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            style={{ width: `${progressPct}%` }}
          />
          {chapters.map((c) => (
            <div
              key={c.id}
              title={c.title}
              className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-white/80"
              style={{
                left: `${duration > 0 ? (c.start_sec / duration) * 100 : 0}%`,
              }}
            />
          ))}
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-brand-600 shadow"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="flex shrink-0 gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                speed === s
                  ? "bg-brand-100 text-brand-700"
                  : "text-muted hover:bg-black/5"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
