"use client";

import type { Participant } from "@/lib/types";
import type { MeetingSort } from "@/lib/types";

export type MeetingFiltersState = {
  q: string;
  participantId: string;
  dateFrom: string;
  dateTo: string;
  sort: MeetingSort;
};

export function MeetingFilters({
  filters,
  participants,
  onChange,
}: {
  filters: MeetingFiltersState;
  participants: Participant[];
  onChange: (next: MeetingFiltersState) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-[200px]">
        <span className="mb-1 block text-xs font-medium text-muted">
          Search by title
        </span>
        <input
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Search meetings..."
          className="input"
        />
      </label>

      <label className="min-w-[160px]">
        <span className="mb-1 block text-xs font-medium text-muted">
          Participant
        </span>
        <select
          value={filters.participantId}
          onChange={(e) =>
            onChange({ ...filters, participantId: e.target.value })
          }
          className="input"
        >
          <option value="">All participants</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted">From</span>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className="input"
        />
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-muted">To</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className="input"
        />
      </label>

      <label className="min-w-[140px]">
        <span className="mb-1 block text-xs font-medium text-muted">Sort</span>
        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ ...filters, sort: e.target.value as MeetingSort })
          }
          className="input"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>
  );
}
