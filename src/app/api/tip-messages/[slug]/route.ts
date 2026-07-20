import { NextResponse } from "next/server";
import { badRequest, notFound, serverError } from "@/lib/api-helpers";
import { getCreatorsStore, validateSlug } from "@/lib/creators";
import { getTipMessages } from "@/lib/tipjar";

/**
 * GET /api/tip-messages/[slug]
 *
 * Read all tip messages for a creator from the TipJar Soroban contract.
 *
 * This is a public read endpoint — anyone can see the tipping wall.
 * Serialized as JSON:
 *   { messages: [{ from, amount, note, timestamp, txHash }, ...] }
 * (amount and timestamp are converted from BigInt to string for JSON safety)
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

  try {
    const messages = await getTipMessages(creator.walletAddress);
    // BigInt → string for JSON serialization
    const serialized = messages.map((m) => ({
      from: m.from,
      amount: m.amount.toString(),
      note: m.note,
      timestamp: m.timestamp.toString(),
      txHash: m.txHash,
    }));
    return NextResponse.json({ messages: serialized });
  } catch (err) {
    console.error(
      `[tip-messages/${creator.slug}] fetch failed:`,
      (err as Error).message,
    );
    return serverError("Failed to fetch tip messages");
  }
}
