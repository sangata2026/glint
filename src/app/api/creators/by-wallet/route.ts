import { NextResponse } from "next/server";
import { badRequest, notFound } from "@/lib/api-helpers";
import { getCreatorsStore } from "@/lib/creators";
import { isValidStellarAddress } from "@/lib/stellar";

/**
 * GET /api/creators/by-wallet?address=G...
 * Lookup a creator by wallet address.
 *
 * Used by the dashboard to find the current user's profile based on their
 * connected wallet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address");

  if (!address) {
    return badRequest("address query parameter is required");
  }
  if (!isValidStellarAddress(address)) {
    return badRequest("Invalid Stellar wallet address");
  }

  const creator = await getCreatorsStore().getByWallet(address);
  if (!creator) return notFound();

  return NextResponse.json(creator);
}
