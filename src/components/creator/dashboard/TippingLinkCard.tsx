"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";

type Props = {
  slug: string;
};

/**
 * Strip the protocol for display so the link reads cleanly. Kept the
 * `https://` out of sight because creators share it verbally / on slides.
 */
function displayUrl(fullUrl: string) {
  return fullUrl.replace(/^https?:\/\//, "");
}

export function TippingLinkCard({ slug }: Props) {
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  // window.location is only available after hydration.
  useEffect(() => {
    setFullUrl(`${window.location.origin}/${slug}`);
  }, [slug]);

  async function handleCopy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  const shown = fullUrl ? displayUrl(fullUrl) : `…/${slug}`;

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl">Your link</h2>
        <Link
          href={`/${slug}`}
          className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline"
        >
          Open public page →
        </Link>
      </div>

      <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
        <div
          className="flex-1 px-3 py-3 bg-[var(--color-surface-sunken)] font-mono text-sm text-[var(--color-ink)] truncate min-w-0"
          title={fullUrl ?? undefined}
        >
          {shown}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!fullUrl}
          className="shrink-0 px-4 bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] mt-3">
        Share this link anywhere — your bio, newsletter, livestream overlay.
        Tips go directly to your Stellar wallet.
      </p>
    </Card>
  );
}
