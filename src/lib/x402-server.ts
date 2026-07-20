import {
  HTTPFacilitatorClient,
  type HTTPRequestContext,
  type RoutesConfig,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { getCreatorsStore } from "./creators";
import {
  DEFAULT_TIP_AMOUNT,
  MAX_TIP_AMOUNT,
  MIN_TIP_AMOUNT,
} from "./tip-limits";

/**
 * Environment configuration for x402 server.
 * All values come from env vars — no secrets hardcoded.
 */
const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const STELLAR_NETWORK =
  (process.env.X402_STELLAR_NETWORK as "stellar:testnet" | "stellar:pubnet") ??
  "stellar:testnet";

/**
 * Build the framework-agnostic x402 resource server.
 * Reused across all x402-protected API routes.
 */
function buildResourceServer(): x402ResourceServer {
  const facilitatorClient = new HTTPFacilitatorClient({
    url: FACILITATOR_URL,
  });

  return new x402ResourceServer(facilitatorClient).register(
    STELLAR_NETWORK,
    new ExactStellarScheme(),
  );
}

/**
 * Extract the slug from a tip endpoint path like "/api/tip/alice".
 */
function extractSlugFromPath(path: string): string | null {
  const match = path.match(/^\/api\/tip\/([^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Read and validate the tip amount from the query string.
 * Defaults to MIN_TIP_AMOUNT when missing or invalid.
 * Clamps to [MIN_TIP_AMOUNT, MAX_TIP_AMOUNT].
 */
function parseTipAmount(context: HTTPRequestContext): string {
  const raw = context.adapter.getQueryParam?.("amount");
  const value = typeof raw === "string" ? raw : undefined;
  if (!value) return DEFAULT_TIP_AMOUNT;

  const num = Number.parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_TIP_AMOUNT;

  const clamped = Math.max(MIN_TIP_AMOUNT, Math.min(MAX_TIP_AMOUNT, num));
  return clamped.toFixed(7);
}

/**
 * Look up a creator's wallet address by slug for `DynamicPayTo`.
 * Throws if the creator doesn't exist — the x402 framework will surface
 * this as a payment error to the client.
 */
async function resolveCreatorPayTo(
  context: HTTPRequestContext,
): Promise<string> {
  const slug = extractSlugFromPath(context.path);
  if (!slug) {
    throw new Error(`Could not extract slug from path: ${context.path}`);
  }
  const creator = await getCreatorsStore().get(slug);
  if (!creator) {
    throw new Error(`Creator not found: ${slug}`);
  }
  return creator.walletAddress;
}

/**
 * Build the route configuration for the x402 HTTP resource server.
 *
 * Routes:
 *   - POST /api/tip/[slug]   → dynamic recipient + dynamic price
 */
function buildRoutes(): RoutesConfig {
  return {
    "POST /api/tip/[slug]": {
      accepts: [
        {
          scheme: "exact",
          price: parseTipAmount,
          network: STELLAR_NETWORK,
          payTo: resolveCreatorPayTo,
        },
      ],
      description: "Tip a creator on Glint",
      mimeType: "application/json",
    },
  };
}

/**
 * Lazily initialize and cache the HTTP resource server.
 * `.initialize()` fetches facilitator /supported — do this once per process.
 */
let _httpServerPromise: Promise<x402HTTPResourceServer> | null = null;

export async function getX402HttpServer(): Promise<x402HTTPResourceServer> {
  if (!_httpServerPromise) {
    _httpServerPromise = (async () => {
      const resourceServer = buildResourceServer();
      const httpServer = new x402HTTPResourceServer(
        resourceServer,
        buildRoutes(),
      );
      await httpServer.initialize();
      return httpServer;
    })();
  }
  return _httpServerPromise;
}
