"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MeetingRowSkeleton } from "@/components/ui/Skeleton";
import {
  MeetingFilters,
  type MeetingFiltersState,
} from "@/components/meetings/MeetingFilters";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { NewMeetingModal } from "@/components/meetings/NewMeetingModal";
import { listMeetings, listParticipants } from "@/lib/api";
import type { MeetingListItem, Participant } from "@/lib/types";

const DEFAULT_FILTERS: MeetingFiltersState = {
  q: "",
  participantId: "",
  dateFrom: "",
  dateTo: "",
  sort: "recent",
};

export default function MeetingsPage() {
  const [filters, setFilters] = useState<MeetingFiltersState>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<MeetingListItem | null>(null);
  const [deleting, setDeleting] = useState<MeetingListItem | null>(null);
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  useEffect(() => {
    listParticipants().then(setParticipants).catch(() => {});
  }, []);

  // Debounce the free-text title search ~300ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMeetings({
        q: debouncedQ || undefined,
        participant_id: filters.participantId
          ? Number(filters.participantId)
          : undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        sort: filters.sort,
      });
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters.participantId, filters.dateFrom, filters.dateTo, filters.sort]);

  useEffect(() => {
    // Fetch-on-mount / fetch-on-filter-change: load() updates loading/error/
    // meetings state as the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const hasActiveFilters =
    !!debouncedQ || !!filters.participantId || !!filters.dateFrom || !!filters.dateTo;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Meetings</h1>
      </div>

      <MeetingFilters
        filters={filters}
        participants={participants}
        onChange={setFilters}
      />

      {error ? (
        <ErrorState onRetry={load} message={error} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MeetingRowSkeleton key={i} />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          hasFilters={hasActiveFilters}
          onNewMeeting={() => setNewMeetingOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <MeetingRow
              key={m.id}
              meeting={m}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <EditMeetingModal
        meeting={editing}
        onClose={() => setEditing(null)}
        onUpdated={(updated) => {
          setMeetings((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    title: updated.title,
                    participants: updated.participants,
                  }
                : m
            )
          );
        }}
      />

      <DeleteMeetingDialog
        meeting={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => setMeetings((prev) => prev.filter((m) => m.id !== id))}
      />

      <NewMeetingModal
        open={newMeetingOpen}
        onClose={() => setNewMeetingOpen(false)}
      />
    </div>
  );
}

function EmptyState({
  hasFilters,
  onNewMeeting,
}: {
  hasFilters: boolean;
  onNewMeeting: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted">
        {hasFilters
          ? "No meetings match these filters."
          : "You don't have any meetings yet."}
      </p>
      {!hasFilters && (
        <Button variant="primary" onClick={onNewMeeting}>
          <Plus size={16} className="mr-1" />
          New meeting
        </Button>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/50 py-16 text-center">
      <AlertTriangle className="text-red-500" size={28} />
      <p className="text-sm text-red-700">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
