"use client";

export type TabItem = {
  key: string;
  label: string;
};

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border px-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "text-brand-700" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
