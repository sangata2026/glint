import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SparkleGlyph } from "@/components/ui/EmptyState";

/**
 * Global 404 page — used when:
 *   - A creator slug doesn't resolve
 *   - A path matches nothing in the app router
 *
 * Keeps the same warm-paper tone as the rest of the app so users don't
 * feel dropped into a default framework page.
 */
export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-20">
      <div className="max-w-md text-center space-y-6">
        <div className="text-[var(--color-accent)] flex justify-center">
          <SparkleGlyph size={56} />
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-ink-muted)]">
            404 — not found
          </p>
          <h1 className="font-display text-4xl text-[var(--color-ink)]">
            Nothing to tip here
          </h1>
          <p className="text-[var(--color-ink-soft)]">
            This creator doesn&apos;t exist — or the link slipped through the
            cracks. Browse who&apos;s on glint, or set up your own tip page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/browse">
            <Button variant="primary" size="md">
              Browse creators
            </Button>
          </Link>
          <Link href="/create">
            <Button variant="secondary" size="md">
              Create your profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
