"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateOnly, formatTime } from "@/lib/format";
import { search } from "@/lib/api";
import type { SearchHit } from "@/lib/types";

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  // Uncontrolled input, reset from the URL via `key={initialQ}` below so we
  // don't need an effect to sync state back from the search param.
  const [inputValue, setInputValue] = useState(initialQ);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQ.trim().length < 2) return;
    // Fetch-on-navigation: runSearch() updates loading/error/hits state as
    // the request for the current ?q= settles. `runSearch` is intentionally
    // omitted from deps: it's redefined each render but only needs to
    // re-run when the query itself changes.
    runSearch(initialQ);
  }, [initialQ]);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    try {
      const results = await search(q);
      setHits(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = inputValue.trim();
    if (q.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const groups = groupByMeeting(hits);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to meetings
      </Link>

      <h1 className="text-xl font-semibold">Search</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <SearchIcon size={16} className="text-muted" />
          <input
            key={initialQ}
            defaultValue={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search across all transcripts (min 2 characters)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <Button variant="primary" type="submit">
          Search
        </Button>
      </form>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/50 py-16 text-center">
          <AlertTriangle className="text-red-500" size={28} />
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="secondary" onClick={() => runSearch(initialQ)}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : initialQ.trim().length < 2 ? (
        <p className="text-sm text-muted">Type at least 2 characters to search.</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">No results for &ldquo;{initialQ}&rdquo;.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.meetingId} className="space-y-2">
              <h2 className="text-sm font-semibold">
                {group.meetingTitle}{" "}
                <span className="font-normal text-muted">
                  &middot; {formatDateOnly(group.meetingDate)}
                </span>
              </h2>
              <div className="space-y-2">
                {group.hits.map((hit) => (
                  <Link
                    key={hit.segment_id}
                    href={`/meetings/${hit.meeting_id}?t=${hit.start_sec}`}
                    className="block rounded-lg border border-border bg-surface p-3 hover:bg-brand-50/50"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                      <span className="font-medium text-foreground">
                        {hit.speaker_label}
                      </span>
                      <span>{formatTime(hit.start_sec)}</span>
                    </div>
                    <p className="text-sm text-foreground">
                      {highlight(hit.text, initialQ)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByMeeting(hits: SearchHit[]) {
  const map = new Map<
    number,
    { meetingId: number; meetingTitle: string; meetingDate: string; hits: SearchHit[] }
  >();
  for (const hit of hits) {
    const existing = map.get(hit.meeting_id);
    if (existing) {
      existing.hits.push(hit);
    } else {
      map.set(hit.meeting_id, {
        meetingId: hit.meeting_id,
        meetingTitle: hit.meeting_title,
        meetingDate: hit.meeting_date,
        hits: [hit],
      });
    }
  }
  return Array.from(map.values());
}
