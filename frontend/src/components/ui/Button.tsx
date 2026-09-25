import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary:
    "bg-white text-foreground border border-border hover:bg-brand-50",
  ghost: "bg-transparent text-foreground hover:bg-black/5",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-sm px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
