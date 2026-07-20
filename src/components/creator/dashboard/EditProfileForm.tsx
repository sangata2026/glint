"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InitialAvatar } from "@/components/ui/InitialAvatar";
import { BIO_MAX, DISPLAY_NAME_MAX } from "@/lib/creators/limits";
import type { Creator } from "@/lib/creators/types";
import { type FormStatus, isBusy } from "@/lib/form-status";

type Props = {
  creator: Creator;
  onSave: (updates: {
    displayName: string;
    bio?: string;
    twitter?: string;
    github?: string;
    website?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const LABEL_CLASSES =
  "block text-xs uppercase tracking-wider text-[var(--color-ink-soft)] mb-2";
const INPUT_CLASSES =
  "w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors";
const TEXTAREA_CLASSES =
  "w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none";

export function EditProfileForm({ creator, onSave }: Props) {
  const [displayName, setDisplayName] = useState(creator.displayName);
  const [bio, setBio] = useState(creator.bio ?? "");
  const [twitter, setTwitter] = useState(creator.twitter ?? "");
  const [github, setGithub] = useState(creator.github ?? "");
  const [website, setWebsite] = useState(creator.website ?? "");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "busy", label: "Saving…" });
    const result = await onSave({
      displayName,
      bio,
      twitter,
      github,
      website,
    });
    if (result.ok) {
      setStatus({ kind: "success", data: undefined });
      toast.success("Profile updated");
      setTimeout(() => setStatus({ kind: "idle" }), 2000);
    } else {
      setStatus({ kind: "error", message: result.error });
      toast.error(result.error);
    }
  }

  const saving = isBusy(status);

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between mb-6">
        <h2 className="font-display text-2xl">Profile</h2>
        <InitialAvatar name={displayName || creator.displayName} size="lg" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="displayName" className={LABEL_CLASSES}>
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={DISPLAY_NAME_MAX}
            required
            className={INPUT_CLASSES}
          />
        </div>

        <div>
          <label htmlFor="bio" className={LABEL_CLASSES}>
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={4}
            className={TEXTAREA_CLASSES}
          />
          <p className="text-xs text-[var(--color-ink-muted)] mt-1 text-right font-mono">
            {bio.length}/{BIO_MAX}
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--color-border)] space-y-5">
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
            Links
          </p>

          <div>
            <label htmlFor="twitter" className={LABEL_CLASSES}>
              Twitter / X
            </label>
            <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] focus-within:border-[var(--color-accent)] transition-colors">
              <span className="pl-3 pr-1 text-sm text-[var(--color-ink-muted)] font-mono">
                @
              </span>
              <input
                id="twitter"
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value.replace(/^@/, ""))}
                placeholder="alicechen"
                maxLength={16}
                disabled={saving}
                className="flex-1 h-11 px-1 bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none font-mono text-sm disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="github" className={LABEL_CLASSES}>
              GitHub
            </label>
            <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] focus-within:border-[var(--color-accent)] transition-colors">
              <span className="pl-3 pr-1 text-sm text-[var(--color-ink-muted)] font-mono">
                github.com/
              </span>
              <input
                id="github"
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value.replace(/^@/, ""))}
                placeholder="alicechen"
                maxLength={40}
                disabled={saving}
                className="flex-1 h-11 px-1 bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none font-mono text-sm disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="website" className={LABEL_CLASSES}>
              Website
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://alice.dev"
              maxLength={200}
              disabled={saving}
              className={INPUT_CLASSES}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
          <Button type="submit" disabled={saving} variant="primary" size="md">
            {status.kind === "busy" ? status.label : "Save changes"}
          </Button>
          {status.kind === "success" && (
            <span className="text-sm text-[var(--color-success)]">Saved</span>
          )}
          {status.kind === "error" && (
            <span className="text-sm text-[var(--color-error)]">
              {status.message}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
