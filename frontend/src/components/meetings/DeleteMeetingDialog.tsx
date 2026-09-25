"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteMeeting } from "@/lib/api";
import type { MeetingDetail, MeetingListItem } from "@/lib/types";

export function DeleteMeetingDialog({
  meeting,
  onClose,
  onDeleted,
}: {
  meeting: MeetingListItem | MeetingDetail | null;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  if (!meeting) return null;

  async function handleDelete() {
    if (!meeting) return;
    setSubmitting(true);
    try {
      await deleteMeeting(meeting.id);
      toast.success("Meeting deleted");
      onDeleted(meeting.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete meeting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!meeting} onClose={onClose} title="Delete meeting">
      <p className="text-sm text-foreground">
        Delete <span className="font-semibold">{meeting.title}</span>? This
        removes its transcript, summary, chapters and action items. This
        cannot be undone.
      </p>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={submitting}>
          {submitting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
