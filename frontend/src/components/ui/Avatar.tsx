import { colorForName, initials } from "@/lib/format";

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({
  name,
  size = "md",
  ringed = false,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  ringed?: boolean;
}) {
  const { bg, fg } = colorForName(name);
  return (
    <div
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
        SIZE_CLASSES[size]
      } ${ringed ? "ring-2 ring-white" : ""}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials(name)}
    </div>
  );
}
