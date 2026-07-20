import { NextResponse } from "next/server";
import {
  badRequest,
  conflict,
  parseJsonBody,
  serverError,
} from "@/lib/api-helpers";
import {
  getCreatorsStore,
  SlugTakenError,
  validateBio,
  validateDisplayName,
  validateGithub,
  validateSlug,
  validateTwitter,
  validateWebsite,
  WalletAlreadyHasProfileError,
} from "@/lib/creators";
import { isValidStellarAddress } from "@/lib/stellar";

const LIST_DEFAULT_LIMIT = 20;
const LIST_MAX_LIMIT = 100;

type CreateRequestBody = {
  slug?: string;
  walletAddress?: string;
  displayName?: string;
  bio?: string;
  twitter?: string;
  github?: string;
  website?: string;
};

/**
 * GET /api/creators?search=...&limit=20&offset=0
 * Browse / search creators. Returns `{ creators, total }`.
 *
 * Public endpoint, no auth. Sorted newest-first.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;

  const rawLimit = Number.parseInt(
    url.searchParams.get("limit") ?? String(LIST_DEFAULT_LIMIT),
    10,
  );
  const limit = Math.min(
    Math.max(1, Number.isFinite(rawLimit) ? rawLimit : LIST_DEFAULT_LIMIT),
    LIST_MAX_LIMIT,
  );

  const rawOffset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);

  try {
    const result = await getCreatorsStore().list({ search, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to list creators:", err);
    return serverError();
  }
}

/**
 * POST /api/creators
 * Create a new creator profile.
 *
 * Body: { slug, walletAddress, displayName, bio? }
 *
 * Note: walletAddress is trusted from the client. In a POC this is acceptable
 * because only the wallet owner can later sign transactions from that address.
 * For production, require a signed message (SEP-10 auth).
 */
export async function POST(request: Request) {
  const body = await parseJsonBody<CreateRequestBody>(request);
  if (!body) return badRequest("Invalid JSON body");

  const slugResult = validateSlug(body.slug ?? "");
  if (!slugResult.ok) return badRequest(slugResult.error);

  if (!isValidStellarAddress(body.walletAddress)) {
    return badRequest("Invalid Stellar wallet address");
  }

  const nameResult = validateDisplayName(body.displayName, { required: true });
  if (!nameResult.ok) return badRequest(nameResult.error);

  const bioResult = validateBio(body.bio);
  if (!bioResult.ok) return badRequest(bioResult.error);

  const twitterResult = validateTwitter(body.twitter);
  if (!twitterResult.ok) return badRequest(twitterResult.error);

  const githubResult = validateGithub(body.github);
  if (!githubResult.ok) return badRequest(githubResult.error);

  const websiteResult = validateWebsite(body.website);
  if (!websiteResult.ok) return badRequest(websiteResult.error);

  try {
    const creator = await getCreatorsStore().create({
      slug: slugResult.slug,
      walletAddress: body.walletAddress,
      displayName: nameResult.value,
      bio: bioResult.value,
      twitter: twitterResult.value,
      github: githubResult.value,
      website: websiteResult.value,
    });
    return NextResponse.json(creator, { status: 201 });
  } catch (err) {
    if (
      err instanceof SlugTakenError ||
      err instanceof WalletAlreadyHasProfileError
    ) {
      return conflict(err.message);
    }
    console.error("Failed to create creator:", err);
    return serverError();
  }
}
