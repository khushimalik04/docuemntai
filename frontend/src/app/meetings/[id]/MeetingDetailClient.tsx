"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Skeleton } from "@/components/ui/Skeleton";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { ExportMenu } from "@/components/meeting/ExportMenu";
import { NotesPanel } from "@/components/meeting/NotesPanel";
import { Transcript } from "@/components/meeting/Transcript";
import { MediaPlayer } from "@/components/meeting/MediaPlayer";
import { usePlayer } from "@/hooks/usePlayer";
import { getMeeting, getTranscript, summarizeMeeting } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import type { ActionItem, MeetingDetail, Segment } from "@/lib/types";

export function MeetingDetailClient({ meetingId }: { meetingId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const player = usePlayer(meeting?.duration_sec ?? 0);
  const seekedFromUrlRef = useRef(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [meetingData, segmentData] = await Promise.all([
        getMeeting(meetingId),
        getTranscript(meetingId),
      ]);
      setMeeting(meetingData);
      setSegments(segmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meeting");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern: load() sets loading/error/data state
    // as the request settles. There's no external subscription to attach to
    // here, just a one-shot request keyed by meetingId. `load` is
    // intentionally omitted from deps: it's redefined each render but only
    // needs to re-run when the meeting id itself changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // Seek to ?t=123 once, after the meeting (and its duration) has loaded.
  useEffect(() => {
    if (!meeting || seekedFromUrlRef.current) return;
    const t = searchParams.get("t");
    if (t) {
      player.seek(Number(t));
    }
    seekedFromUrlRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const updated = await summarizeMeeting(meetingId);
      setMeeting(updated);
      toast.success("Summary regenerated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate summary");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <AlertTriangle className="text-red-500" size={28} />
        <p className="text-sm text-red-700">{error ?? "Meeting not found"}</p>
        <Button variant="secondary" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">
        <Link
          href="/meetings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to meetings
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{meeting.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{formatDate(meeting.date)}</span>
              <span>&middot;</span>
              <span>{formatDuration(meeting.duration_sec)}</span>
            </div>
            <AvatarStack participants={meeting.participants} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={15} className="mr-1.5" />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              <Trash2 size={15} className="mr-1.5" />
              Delete
            </Button>
            <ExportMenu meeting={meeting} segments={segments} />
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              <RefreshCw
                size={15}
                className={`mr-1.5 ${regenerating ? "animate-spin" : ""}`}
              />
              Regenerate summary
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div className="min-h-[420px] lg:h-[calc(100vh-320px)]">
            <NotesPanel
              meeting={meeting}
              currentTime={player.currentTime}
              onSeek={player.seek}
              onActionItemsChange={(items: ActionItem[]) =>
                setMeeting((m) => (m ? { ...m, action_items: items } : m))
              }
            />
          </div>
          <div className="min-h-[420px] rounded-xl border border-border bg-surface lg:h-[calc(100vh-320px)]">
            <Transcript
              segments={segments}
              currentTime={player.currentTime}
              onSeek={player.seek}
            />
          </div>
        </div>
      </div>

      <MediaPlayer
        currentTime={player.currentTime}
        duration={meeting.duration_sec}
        isPlaying={player.isPlaying}
        speed={player.speed}
        chapters={meeting.chapters}
        onToggle={player.toggle}
        onSkip={player.skip}
        onSeek={player.seek}
        onSpeedChange={player.setSpeed}
      />

      {editing && (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setEditing(false)}
          onUpdated={(updated) =>
            setMeeting((m) =>
              m
                ? { ...m, title: updated.title, participants: updated.participants }
                : m
            )
          }
        />
      )}

      {deleting && (
        <DeleteMeetingDialog
          meeting={meeting}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            router.push("/meetings");
          }}
        />
      )}
    </div>
  );
}
