"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { updateMeeting } from "@/lib/api";
import type { MeetingDetail, MeetingListItem } from "@/lib/types";

export function EditMeetingModal({
  meeting,
  onClose,
  onUpdated,
}: {
  meeting: MeetingListItem | MeetingDetail | null;
  onClose: () => void;
  onUpdated: (updated: MeetingDetail) => void;
}) {
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form fields whenever a different meeting is opened for
  // editing. Adjusted during render (React's recommended pattern) instead
  // of in an effect, keyed off the meeting id so it only fires on open.
  const [loadedMeetingId, setLoadedMeetingId] = useState<number | null>(null);
  if (meeting && meeting.id !== loadedMeetingId) {
    setLoadedMeetingId(meeting.id);
    setTitle(meeting.title);
    setParticipants(meeting.participants.map((p) => p.name).join(", "));
  }

  if (!meeting) return null;

  async function handleSubmit() {
    if (!meeting) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateMeeting(meeting.id, {
        title: title.trim(),
        participants: participants
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      });
      toast.success("Meeting updated");
      onUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update meeting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!meeting} onClose={onClose} title="Edit meeting">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Participants (comma separated)
          </span>
          <input
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="input"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
