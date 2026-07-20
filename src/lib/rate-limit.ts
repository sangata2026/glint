/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for single-region, small-scale serverless deployments with a
 * few instances. Each instance keeps its own counters, so the effective
 * global limit is `limit × instanceCount`. Replace with Redis / Firestore
 * rate-limit backend before any serious traffic.
 *
 * Each bucket entry is pruned lazily on access; there's no background sweep,
 * so memory stays proportional to active clients over the window.
 */

type Bucket = {
  /** Millisecond timestamps of the hits inside the current window. */
  hits: number[];
};

type Options = {
  /** Window length in ms. Default 60_000. */
  windowMs?: number;
  /** Max hits per window. Default 5. */
  max?: number;
};

type Result =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSec: number };

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 5;

const buckets = new Map<string, Bucket>();

/**
 * Try to consume a token for the given key. Returns { allowed: false } with
 * a `retryAfterSec` value suitable for a `Retry-After` header if the client
 * has exceeded `max` hits in the rolling `windowMs` window.
 */
export function rateLimit(key: string, opts: Options = {}): Result {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts.max ?? DEFAULT_MAX;
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };
  const fresh = bucket.hits.filter((t) => t > cutoff);

  if (fresh.length >= max) {
    buckets.set(key, { hits: fresh });
    const oldest = fresh[0];
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  fresh.push(now);
  buckets.set(key, { hits: fresh });
  return { allowed: true, remaining: max - fresh.length };
}

/**
 * Extract the client IP from a Next.js request. Falls back to `unknown` so
 * the limiter still works when headers are missing (all unknown callers
 * share a bucket — intentional for safety).
 */
export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
