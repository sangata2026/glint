/**
 * Slug validation for creator URLs.
 *
 * Valid slugs:
 *   - 3-20 characters
 *   - lowercase letters, digits, dashes, underscores only
 *   - not in the reserved word list (collides with app routes)
 */

const SLUG_REGEX = /^[a-z0-9_-]{3,20}$/;

/**
 * Reserved words that cannot be used as slugs because they collide with
 * app routes, API paths, or common static assets.
 */
const RESERVED_SLUGS = new Set([
  "api",
  "test",
  "create",
  "dashboard",
  "browse",
  "admin",
  "login",
  "logout",
  "signup",
  "signin",
  "about",
  "help",
  "support",
  "terms",
  "privacy",
  "settings",
  "_next",
  "_vercel",
  "static",
  "assets",
  "public",
  "favicon",
  "robots",
  "sitemap",
  "manifest",
  "www",
  "mail",
  "ftp",
  "null",
  "undefined",
  "true",
  "false",
]);

export type SlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Validate a slug. Returns normalized (lowercased) slug on success.
 */
export function validateSlug(raw: string): SlugValidationResult {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Slug is required" };
  }

  const slug = raw.trim().toLowerCase();

  if (slug.length < 3) {
    return { ok: false, error: "Slug must be at least 3 characters" };
  }

  if (slug.length > 20) {
    return { ok: false, error: "Slug must be at most 20 characters" };
  }

  if (!SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      error:
        "Slug can only contain lowercase letters, digits, dashes and underscores",
    };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: `"${slug}" is a reserved word` };
  }

  return { ok: true, slug };
}
