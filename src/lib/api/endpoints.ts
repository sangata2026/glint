/**
 * Single source of truth for Glint API endpoint paths.
 *
 * Use these constants everywhere instead of string-concatenating URLs.
 * Parameterized routes are exposed as small builder functions.
 *
 * Keep routes in sync with `src/app/api/**` folder structure.
 */

const API_PREFIX = "/api";

export const API_ENDPOINTS = {
  /** POST to create a creator, GET to list/search creators */
  CREATORS: `${API_PREFIX}/creators`,

  /** GET a single creator by slug, PATCH to update */
  creatorBySlug: (slug: string) =>
    `${API_PREFIX}/creators/${encodeURIComponent(slug)}`,

  /** GET creator by wallet address (query: ?address=G...) */
  CREATOR_BY_WALLET: `${API_PREFIX}/creators/by-wallet`,

  /** POST x402-protected tip endpoint for a creator */
  tip: (slug: string) => `${API_PREFIX}/tip/${encodeURIComponent(slug)}`,

  /** GET on-chain tip messages for a creator (tipping wall) */
  tipMessages: (slug: string) =>
    `${API_PREFIX}/tip-messages/${encodeURIComponent(slug)}`,
} as const;
