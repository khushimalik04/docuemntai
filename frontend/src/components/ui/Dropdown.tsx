"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type DropdownOption = {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

/** A small button that opens a floating menu of options on click. */
export function Dropdown({
  trigger,
  options,
  align = "left",
}: {
  trigger: ReactNode;
  options: DropdownOption[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setOpen(false);
                opt.onSelect();
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                opt.danger ? "text-red-600" : "text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
