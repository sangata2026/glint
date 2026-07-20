import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md " +
  "transition-[background-color,border-color,transform,opacity] duration-150 " +
  "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[var(--color-accent)]";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-ink)] " +
    "hover:bg-[var(--color-accent-hover)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink)] " +
    "border border-[var(--color-border)] hover:border-[var(--color-border-strong)] " +
    "hover:bg-[var(--color-surface-sunken)]",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * Design-system button. Primary = dark olive filled; Secondary = outlined
 * on cream; Ghost = transparent text button for toolbar / tertiary actions.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: Props) {
  const cls = [
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
