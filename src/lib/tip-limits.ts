/**
 * Tip amount + message length limits.
 *
 * Kept in a server-safe flat module so both client components (TipForm) and
 * server modules (x402-server, tip route) can import without pulling in any
 * server-only dependencies.
 */

/** Minimum tip in USDC. */
export const MIN_TIP_AMOUNT = 0.01;

/** Maximum tip in USDC. */
export const MAX_TIP_AMOUNT = 1000;

/** Default tip string used when the client omits `?amount=`. */
export const DEFAULT_TIP_AMOUNT = "0.01";

/** Max length of the on-chain tip message stored in TipJar. */
export const TIP_MESSAGE_MAX = 280;
