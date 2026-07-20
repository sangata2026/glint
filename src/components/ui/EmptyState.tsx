import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Generic empty-state card. Use when a list, dashboard, or form area has
 * no content yet.
 *
 * @example
 *   <EmptyState
 *     icon={<WalletIcon />}
 *     title="No wallet connected"
 *     description="Connect Freighter to continue"
 *     action={<ConnectButton />}
 *   />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-10 text-center space-y-4 ${className}`}
    >
      {icon && (
        <div className="flex justify-center text-[var(--color-ink-muted)]">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl text-[var(--color-ink)]">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-ink-soft)] max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/** Stand-alone wallet icon — used in no-wallet empty states. */
export function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

/** Sparkles icon — used for "no tips yet" state. */
export function SparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 3 11 6l3 1.5L11 9l-1.5 3L8 9 5 7.5 8 6Z" />
      <path d="M17 12l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <path d="M17 3l.5 1 1 .5-1 .5L17 6l-.5-1-1-.5 1-.5Z" />
    </svg>
  );
}

/**
 * 4-point sparkle — the glint logomark. Always pair with the wordmark.
 * Can be used alone inside empty states / success confirmations.
 */
export function SparkleGlyph({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 1.5 13.7 8.5 20.5 12 13.7 15.5 12 22.5 10.3 15.5 3.5 12 10.3 8.5Z" />
    </svg>
  );
}

/** User icon — used for "no profile" state. */
export function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
