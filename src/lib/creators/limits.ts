/**
 * Length limits for creator profile fields.
 * Single source of truth — server validators and client forms both import from here.
 */

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 280;

/** Twitter handle max (excluding optional leading `@`). */
export const TWITTER_HANDLE_MAX = 15;
/** GitHub username max (GitHub's own limit is 39). */
export const GITHUB_HANDLE_MAX = 39;
/** Website URL max — keeps storage bounded. */
export const WEBSITE_URL_MAX = 200;
