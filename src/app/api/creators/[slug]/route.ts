import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  notFound,
  parseJsonBody,
  serverError,
} from "@/lib/api-helpers";
import {
  getCreatorsStore,
  NotProfileOwnerError,
  validateBio,
  validateDisplayName,
  validateGithub,
  validateSlug,
  validateTwitter,
  validateWebsite,
} from "@/lib/creators";

type UpdateRequestBody = {
  walletAddress?: string;
  displayName?: string;
  bio?: string;
  twitter?: string;
  github?: string;
  website?: string;
};

/**
 * GET /api/creators/[slug]
 * Fetch a creator profile by slug.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const slugResult = validateSlug(slug);
  if (!slugResult.ok) return badRequest(slugResult.error);

  const creator = await getCreatorsStore().get(slugResult.slug);
  if (!creator) return notFound("Creator not found");

  return NextResponse.json(creator);
}

/**
 * PATCH /api/creators/[slug]
 * Update a creator profile. Caller must include their walletAddress in the
 * body; it must match the profile's owner.
 *
 * Body: { walletAddress, displayName?, bio? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const slugResult = validateSlug(slug);
  if (!slugResult.ok) return badRequest(slugResult.error);

  const body = await parseJsonBody<UpdateRequestBody>(request);
  if (!body) return badRequest("Invalid JSON body");

  if (!body.walletAddress || typeof body.walletAddress !== "string") {
    return badRequest("walletAddress is required");
  }

  const nameResult = validateDisplayName(body.displayName, { required: false });
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
    const updated = await getCreatorsStore().update(
      slugResult.slug,
      body.walletAddress,
      {
        displayName: nameResult.value,
        bio: bioResult.value,
        twitter: twitterResult.value,
        github: githubResult.value,
        website: websiteResult.value,
      },
    );
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof NotProfileOwnerError) {
      return forbidden(err.message);
    }
    if ((err as Error).message.includes("not found")) {
      return notFound("Creator not found");
    }
    console.error("Failed to update creator:", err);
    return serverError();
  }
}
