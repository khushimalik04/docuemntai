"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { createMeeting, uploadMeeting } from "@/lib/api";

const PLACEHOLDER = `[00:00:05] Priya Sharma: Let's kick off the roadmap review.
[00:00:12] Amit Rao: Sounds good, I'll share the Q4 numbers first.
Amit Rao: One second, pulling up the deck.`;

export function NewMeetingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("paste");
  const [submitting, setSubmitting] = useState(false);

  // Paste tab state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => toDateTimeLocal(new Date()));
  const [participants, setParticipants] = useState("");
  const [transcriptText, setTranscriptText] = useState("");

  // Upload tab state
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTab("paste");
    setTitle("");
    setDate(toDateTimeLocal(new Date()));
    setParticipants("");
    setTranscriptText("");
    setFile(null);
    setUploadTitle("");
  }

  function handleClose() {
    if (!submitting) {
      reset();
      onClose();
    }
  }

  async function handlePasteSubmit() {
    if (!title.trim() || !transcriptText.trim()) {
      toast.error("Title and transcript are required");
      return;
    }
    setSubmitting(true);
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        date: date ? new Date(date).toISOString() : undefined,
        participants: participants
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        transcript_text: transcriptText,
      });
      toast.success("Meeting created");
      handleClose();
      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadSubmit() {
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("file", file);
      if (uploadTitle.trim()) form.set("title", uploadTitle.trim());
      const meeting = await uploadMeeting(form);
      toast.success("Meeting created");
      handleClose();
      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload meeting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New meeting" widthClassName="max-w-xl">
      <Tabs
        tabs={[
          { key: "paste", label: "Paste transcript" },
          { key: "upload", label: "Upload file" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "paste" ? (
        <div className="mt-4 space-y-3">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Weekly sync"
            />
          </Field>
          <Field label="Date">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Participants (comma separated)">
            <input
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="input"
              placeholder="Priya Sharma, Amit Rao"
            />
          </Field>
          <Field label="Transcript">
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              rows={8}
              placeholder={PLACEHOLDER}
              className="input font-mono text-xs"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePasteSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create meeting"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Field label="Title (optional)">
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="input"
              placeholder="Defaults to the file name"
            />
          </Field>
          <Field label="File (.txt, .vtt, .json)">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-4 py-8 text-center hover:border-brand-400"
            >
              <p className="text-sm text-muted">
                {file ? file.name : "Click to choose a transcript file"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.vtt,.json"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadSubmit} disabled={submitting}>
              {submitting ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
