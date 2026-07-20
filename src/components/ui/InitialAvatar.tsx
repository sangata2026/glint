type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-lg",
  lg: "w-14 h-14 text-2xl",
  xl: "w-20 h-20 text-4xl",
};

type Props = {
  name: string;
  size?: Size;
};

/**
 * Circle avatar showing the first letter of a name. Display-serif letter
 * on warm tan background. Used across creator lists, profile headers,
 * dashboard wallet card, etc.
 */
export function InitialAvatar({ name, size = "md" }: Props) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`shrink-0 rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] flex items-center justify-center font-display text-[var(--color-ink)] ${SIZE_CLASSES[size]}`}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
