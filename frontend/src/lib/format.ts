// Small formatting helpers shared across the app. Kept dependency-free.

/** Formats seconds as mm:ss, or h:mm:ss once it reaches an hour. */
export function formatTime(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Formats a duration in seconds as "24 min" or "1 hr 5 min". */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Formats an ISO date string as "Thu, Sep 18 · 10:30 AM". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

/** Formats an ISO date string as just the date, e.g. "Sep 18, 2026". */
export function formatDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Groups items into date-based sections (Today / Yesterday / "Thu, Sep 18"),
 * mirroring the date-header grouping used in Fireflies' meeting list.
 * Preserves the incoming order; only consecutive/all same-day items are merged. */
export function groupByDateHeading<T>(
  items: T[],
  getIso: (item: T) => string,
): { heading: string; items: T[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = new Map<string, { heading: string; items: T[] }>();
  for (const item of items) {
    const d = new Date(getIso(item));
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const key = dayStart.toISOString();

    let heading: string;
    if (dayStart.getTime() === today.getTime()) heading = "Today";
    else if (dayStart.getTime() === yesterday.getTime()) heading = "Yesterday";
    else
      heading = dayStart.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year:
          dayStart.getFullYear() !== today.getFullYear()
            ? "numeric"
            : undefined,
      });

    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { heading, items: [item] });
  }
  return Array.from(groups.values());
}

/** Initials from a display name, e.g. "Priya Sharma" -> "PS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A small, fixed palette of accessible background/text pairs used to
// deterministically color avatars by name (no randomness, so a given
// person always gets the same color across the app).
const AVATAR_COLORS = [
  { bg: "#EDE9FE", fg: "#6D28D9" }, // violet
  { bg: "#DBEAFE", fg: "#1D4ED8" }, // blue
  { bg: "#DCFCE7", fg: "#15803D" }, // green
  { bg: "#FEF3C7", fg: "#B45309" }, // amber
  { bg: "#FCE7F3", fg: "#BE185D" }, // pink
  { bg: "#E0F2FE", fg: "#0369A1" }, // sky
  { bg: "#FFE4E6", fg: "#BE123C" }, // rose
  { bg: "#ECFCCB", fg: "#4D7C0F" }, // lime
];

/** Deterministic color pair for an avatar background, based on the name. */
export function colorForName(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
