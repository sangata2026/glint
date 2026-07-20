import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

/**
 * Animated skeleton placeholder. Use for loading states.
 *
 * Pass any Tailwind classes via `className` to size/shape it:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="h-20 w-full rounded" />
 */
export function Skeleton({ className = "", ...rest }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[var(--color-surface-sunken)] rounded ${className}`}
      {...rest}
    />
  );
}
