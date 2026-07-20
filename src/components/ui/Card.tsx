import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Adds extra inner padding. Default: "md" (p-6). */
  padding?: "none" | "sm" | "md" | "lg";
  /** Sunken tan variant (used for inset fields). Default false. */
  sunken?: boolean;
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/**
 * Warm cream card container. 1px tan border, no shadow.
 */
export function Card({
  children,
  padding = "md",
  sunken = false,
  className = "",
  ...rest
}: Props) {
  const bg = sunken
    ? "bg-[var(--color-surface-sunken)]"
    : "bg-[var(--color-surface)]";
  const cls = [
    bg,
    "border border-[var(--color-border)] rounded-lg",
    PADDING[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
