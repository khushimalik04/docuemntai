"use client";

import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TranscriptLine } from "./TranscriptLine";
import type { Segment } from "@/lib/types";

export function Transcript({
  segments,
  currentTime,
  onSeek,
}: {
  segments: Segment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  // Reset the match cursor whenever the query itself changes. Adjusted
  // during render (React's recommended pattern for derived resets) instead
  // of in an effect, so it happens in the same commit as the query change.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setMatchIndex(0);
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastManualScrollRef = useRef(0);

  const activeSegmentId = useMemo(() => {
    let active: Segment | null = null;
    for (const s of segments) {
      if (s.start_sec <= currentTime) active = s;
      else break;
    }
    return active?.id ?? null;
  }, [segments, currentTime]);

  const matches = useMemo(() => {
    if (!query.trim()) return [] as number[];
    const q = query.toLowerCase();
    return segments
      .filter((s) => s.text.toLowerCase().includes(q))
      .map((s) => s.id);
  }, [segments, query]);

  // Mark manual scrolls so auto-scroll-to-active-line can pause briefly.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      lastManualScrollRef.current = Date.now();
    };
    el.addEventListener("wheel", onScroll, { passive: true });
    el.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onScroll);
      el.removeEventListener("touchmove", onScroll);
    };
  }, []);

  // Keep the active line visible whenever it changes: during playback and also
  // after a seek from elsewhere (outline, action item timestamps, ?t= links).
  // Skipped for a few seconds after the user scrolls the transcript by hand.
  useEffect(() => {
    if (activeSegmentId === null) return;
    if (Date.now() - lastManualScrollRef.current < 4000) return;
    const el = lineRefs.current.get(activeSegmentId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSegmentId]);

  function scrollToMatch(index: number) {
    const id = matches[index];
    if (id === undefined) return;
    lastManualScrollRef.current = Date.now();
    lineRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function goToMatch(delta: number) {
    if (matches.length === 0) return;
    const next = (matchIndex + delta + matches.length) % matches.length;
    setMatchIndex(next);
    scrollToMatch(next);
  }

  const currentMatchId = matches[matchIndex];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        {query.trim() && (
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <span>
              {matches.length > 0 ? matchIndex + 1 : 0} of {matches.length}
            </span>
            <button
              onClick={() => goToMatch(-1)}
              disabled={matches.length === 0}
              className="rounded p-1 hover:bg-black/5 disabled:opacity-40"
              aria-label="Previous match"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => goToMatch(1)}
              disabled={matches.length === 0}
              className="rounded p-1 hover:bg-black/5 disabled:opacity-40"
              aria-label="Next match"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-2">
        {segments.length === 0 ? (
          <p className="p-4 text-sm text-muted">No transcript available.</p>
        ) : (
          segments.map((s) => (
            <TranscriptLine
              key={s.id}
              segment={s}
              query={query}
              isCurrentMatch={s.id === currentMatchId}
              isActive={s.id === activeSegmentId}
              onSeek={onSeek}
              ref={(el) => {
                if (el) lineRefs.current.set(s.id, el);
                else lineRefs.current.delete(s.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
