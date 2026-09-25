"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatTime } from "@/lib/format";
import {
  createActionItem,
  deleteActionItem,
  updateActionItem,
} from "@/lib/api";
import type { ActionItem, Participant } from "@/lib/types";

export function ActionItemsTab({
  meetingId,
  actionItems,
  participants,
  onChange,
  onSeek,
}: {
  meetingId: number;
  actionItems: ActionItem[];
  participants: Participant[];
  onChange: (items: ActionItem[]) => void;
  onSeek: (seconds: number) => void;
}) {
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  function replace(id: number, updated: ActionItem) {
    onChange(actionItems.map((a) => (a.id === id ? updated : a)));
  }

  async function toggleCompleted(item: ActionItem) {
    try {
      const updated = await updateActionItem(item.id, {
        completed: !item.completed,
      });
      replace(item.id, updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function editText(item: ActionItem, text: string) {
    if (text.trim() === item.text) return;
    try {
      const updated = await updateActionItem(item.id, { text: text.trim() });
      replace(item.id, updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function editAssignee(item: ActionItem, assigneeName: string) {
    try {
      const updated = await updateActionItem(item.id, {
        assignee_name: assigneeName || null,
      });
      replace(item.id, updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function remove(item: ActionItem) {
    try {
      await deleteActionItem(item.id);
      onChange(actionItems.filter((a) => a.id !== item.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function addNew() {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const created = await createActionItem(meetingId, { text: newText.trim() });
      onChange([...actionItems, created]);
      setNewText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add action item");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {actionItems.length === 0 && (
        <p className="px-1 py-2 text-sm text-muted">No action items yet.</p>
      )}

      {actionItems.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-lg border border-border p-2.5"
        >
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => toggleCompleted(item)}
            className="mt-1 h-4 w-4 accent-brand-600"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              defaultValue={item.text}
              onBlur={(e) => editText(item, e.target.value)}
              className={`w-full bg-transparent text-sm outline-none ${
                item.completed ? "text-muted line-through" : "text-foreground"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={item.assignee?.name ?? ""}
                onChange={(e) => editAssignee(item, e.target.value)}
                className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs"
              >
                <option value="">Unassigned</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {item.start_sec !== null && (
                <button
                  onClick={() => onSeek(item.start_sec as number)}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  {formatTime(item.start_sec)}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => remove(item)}
            aria-label="Delete action item"
            className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="mt-1 flex items-center gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNew();
          }}
          placeholder="Add an action item..."
          className="input"
          disabled={adding}
        />
      </div>
    </div>
  );
}
