export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-black/[0.06] ${className}`} />
  );
}

export function MeetingRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}
