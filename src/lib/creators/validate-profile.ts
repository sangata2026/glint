import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  GITHUB_HANDLE_MAX,
  TWITTER_HANDLE_MAX,
  WEBSITE_URL_MAX,
} from "./limits";

/**
 * Shared validators for creator profile fields.
 * Used by POST /api/creators (required) and PATCH /api/creators/[slug] (optional).
 */

export type FieldResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Validate a display name.
 *
 * Overloads:
 *   - `{ required: true }` → value must be a non-empty string
 *   - `{ required: false }` → `undefined` passes through unchanged
 */
export function validateDisplayName(
  raw: unknown,
  opts: { required: true },
): FieldResult<string>;
export function validateDisplayName(
  raw: unknown,
  opts: { required: false },
): FieldResult<string | undefined>;
export function validateDisplayName(
  raw: unknown,
  { required }: { required: boolean },
): FieldResult<string | undefined> {
  if (raw === undefined) {
    if (required) return { ok: false, error: "Display name is required" };
    return { ok: true, value: undefined };
  }

  if (typeof raw !== "string") {
    return { ok: false, error: "Display name must be a string" };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    if (required) return { ok: false, error: "Display name is required" };
    return { ok: false, error: "Display name cannot be empty" };
  }
  if (trimmed.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: `Display name must be ${DISPLAY_NAME_MAX} characters or less`,
    };
  }

  return { ok: true, value: trimmed };
}

/**
 * Validate an optional bio. Empty/whitespace becomes `undefined`.
 */
export function validateBio(raw: unknown): FieldResult<string | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };

  if (typeof raw !== "string") {
    return { ok: false, error: "Bio must be a string" };
  }

  if (raw.length > BIO_MAX) {
    return { ok: false, error: `Bio must be ${BIO_MAX} characters or less` };
  }

  const trimmed = raw.trim();
  return { ok: true, value: trimmed.length > 0 ? trimmed : undefined };
}

// Social handles & URLs — all optional, all normalised to `undefined` when empty.

const TWITTER_RE = /^[A-Za-z0-9_]{1,15}$/;
const GITHUB_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/**
 * Validate a Twitter / X handle. Accepts with or without a leading `@`.
 * Stored WITHOUT the `@` — the UI prepends it for display.
 */
export function validateTwitter(raw: unknown): FieldResult<string | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== "string") {
    return { ok: false, error: "Twitter handle must be a string" };
  }

  const trimmed = raw.trim().replace(/^@/, "");
  if (trimmed.length === 0) return { ok: true, value: undefined };
  if (trimmed.length > TWITTER_HANDLE_MAX) {
    return {
      ok: false,
      error: `Twitter handle must be ${TWITTER_HANDLE_MAX} characters or less`,
    };
  }
  if (!TWITTER_RE.test(trimmed)) {
    return {
      ok: false,
      error:
        "Twitter handle can only contain letters, numbers, and underscores",
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a GitHub username. Matches GitHub's own handle rules.
 */
export function validateGithub(raw: unknown): FieldResult<string | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== "string") {
    return { ok: false, error: "GitHub username must be a string" };
  }

  const trimmed = raw.trim().replace(/^@/, "");
  if (trimmed.length === 0) return { ok: true, value: undefined };
  if (trimmed.length > GITHUB_HANDLE_MAX) {
    return {
      ok: false,
      error: `GitHub username must be ${GITHUB_HANDLE_MAX} characters or less`,
    };
  }
  if (!GITHUB_RE.test(trimmed)) {
    return {
      ok: false,
      error:
        "GitHub username may only contain letters, numbers, and single hyphens",
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a website URL. Only http/https allowed, length-bounded.
 * If the user didn't include a protocol, we prepend `https://` before parsing
 * so `example.com` accepts.
 */
export function validateWebsite(raw: unknown): FieldResult<string | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== "string") {
    return { ok: false, error: "Website must be a string" };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: true, value: undefined };
  if (trimmed.length > WEBSITE_URL_MAX) {
    return {
      ok: false,
      error: `Website URL must be ${WEBSITE_URL_MAX} characters or less`,
    };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { ok: false, error: "Website must be a valid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Website must use http or https" };
  }

  return { ok: true, value: parsed.toString() };
}
