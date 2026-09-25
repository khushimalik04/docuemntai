"use client";

import { CheckCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { colorForName, formatTime } from "@/lib/format";
import {
  createActionItem,
  deleteActionItem,
  updateActionItem,
} from "@/lib/api";
import type { ActionItem, Participant } from "@/lib/types";

function groupByAssignee(
  items: ActionItem[],
): { name: string; items: ActionItem[] }[] {
  const groups = new Map<string, ActionItem[]>();
  for (const item of items) {
    const name = item.assignee?.name ?? "Unassigned";
    const bucket = groups.get(name);
    if (bucket) bucket.push(item);
    else groups.set(name, [item]);
  }
  return Array.from(groups.entries()).map(([name, groupItems]) => ({
    name,
    items: groupItems,
  }));
}

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
  const [completingAll, setCompletingAll] = useState(false);

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
      const created = await createActionItem(meetingId, {
        text: newText.trim(),
      });
      onChange([...actionItems, created]);
      setNewText("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add action item",
      );
    } finally {
      setAdding(false);
    }
  }

  async function completeAll() {
    const openItems = actionItems.filter((a) => !a.completed);
    if (openItems.length === 0) return;
    setCompletingAll(true);
    try {
      const updated = await Promise.all(
        openItems.map((item) => updateActionItem(item.id, { completed: true })),
      );
      const byId = new Map(updated.map((u) => [u.id, u]));
      onChange(actionItems.map((a) => byId.get(a.id) ?? a));
      toast.success(`Marked ${openItems.length} action item(s) complete`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete all",
      );
    } finally {
      setCompletingAll(false);
    }
  }

  const groups = useMemo(() => groupByAssignee(actionItems), [actionItems]);
  const openCount = actionItems.filter((a) => !a.completed).length;

  return (
    <div className="flex flex-col gap-4 p-3">
      {actionItems.length === 0 && (
        <p className="px-1 py-2 text-sm text-muted">No action items yet.</p>
      )}

      {actionItems.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted">
            {openCount > 0 ? `${openCount} open` : "All complete"}
          </span>
          <button
            onClick={completeAll}
            disabled={openCount === 0 || completingAll}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <CheckCheck size={14} />
            Mark all complete
          </button>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.name} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Avatar name={group.name} size="sm" />
            <span
              className="text-sm font-semibold"
              style={{ color: colorForName(group.name).fg }}
            >
              {group.name}
            </span>
          </div>

          {group.items.map((item) => (
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
                    item.completed
                      ? "text-muted line-through"
                      : "text-foreground"
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
