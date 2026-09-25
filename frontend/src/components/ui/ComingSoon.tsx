import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon size={28} />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
        Coming Soon
      </span>
    </div>
  );
}
