import { Keypair } from "@stellar/stellar-sdk";
import { mnemonicToSeed, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";

/**
 * HD (hierarchical deterministic) wallet derivation helpers for Stellar.
 *
 * Stellar uses SEP-0005 for key derivation. Given the same BIP-39 mnemonic
 * and an account index, you always get the same keypair. Freighter uses
 * this scheme, so account index 0 in the app maps to the first Freighter
 * account, index 1 to the second, etc.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md
 */

/**
 * Build the SEP-0005 derivation path for a given Stellar account index.
 */
export function stellarDerivationPath(accountIndex: number): string {
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error(
      `Account index must be a non-negative integer, got ${accountIndex}`,
    );
  }
  return `m/44'/148'/${accountIndex}'`;
}

/**
 * Derive a Stellar {@link Keypair} from a BIP-39 mnemonic and an account index.
 *
 * Throws if the mnemonic is invalid or the index is out of range.
 */
export async function deriveKeypairFromMnemonic(
  mnemonic: string,
  accountIndex: number,
): Promise<Keypair> {
  if (!mnemonic) {
    throw new Error("Mnemonic is required");
  }
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid BIP-39 mnemonic");
  }
  const seed = await mnemonicToSeed(mnemonic);
  const { key } = derivePath(
    stellarDerivationPath(accountIndex),
    seed.toString("hex"),
  );
  return Keypair.fromRawEd25519Seed(key);
}
