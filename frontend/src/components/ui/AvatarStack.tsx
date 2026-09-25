import { Avatar } from "./Avatar";
import type { Participant } from "@/lib/types";

export function AvatarStack({
  participants,
  max = 4,
}: {
  participants: Participant[];
  max?: number;
}) {
  if (participants.length === 0) {
    return <span className="text-xs text-muted">No participants</span>;
  }
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} size="md" ringed />
      ))}
      {extra > 0 && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 ring-2 ring-white">
          +{extra}
        </div>
      )}
    </div>
  );
}
