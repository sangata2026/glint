import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "5xl" | "6xl";

const MAX_WIDTH_CLASSES: Record<MaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

type Props = {
  children: ReactNode;
  /** Max-width of the content column. Default: "3xl". */
  maxWidth?: MaxWidth;
  /** Show the shared site header (brand + wallet button). Default: true. */
  showHeader?: boolean;
};

/**
 * Shared page shell. Centers content, renders the sticky site header,
 * and applies the warm cream page background.
 */
export function PageShell({
  children,
  maxWidth = "3xl",
  showHeader = true,
}: Props) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex flex-col">
      {showHeader && <SiteHeader />}
      <main
        className={`flex-1 w-full ${MAX_WIDTH_CLASSES[maxWidth]} mx-auto px-6 py-12`}
      >
        {children}
      </main>
    </div>
  );
}
