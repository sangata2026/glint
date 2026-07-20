import {
  getAddress,
  isAllowed,
  isConnected,
  setAllowed,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "../stellar";

/**
 * Freighter wallet helpers.
 *
 * Freighter API v6 returns `{ data..., error? }` instead of throwing. We
 * normalize all calls here to a tagged union {@link FreighterResult} so UI
 * code can branch without try/catch. See `./signer.ts` for the x402-compatible
 * signer interface — that one has to throw because it implements an external
 * contract (`ClientStellarSigner`) that doesn't allow tagged unions.
 */

export type FreighterResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Check if Freighter extension is installed AND this dApp is allowed.
 * Used for silent auto-reconnect on mount.
 *
 * Returns `{ ok: true, value: null }` when Freighter is not installed or
 * not yet allowed — these are not errors, just "no active connection".
 * Returns `{ ok: true, value: address }` when a previous session exists.
 */
export async function checkPreviouslyAllowed(): Promise<
  FreighterResult<string | null>
> {
  const conn = await isConnected();
  if (conn.error) return { ok: false, error: conn.error.message };
  if (!conn.isConnected) return { ok: true, value: null };

  const allowed = await isAllowed();
  if (allowed.error) return { ok: false, error: allowed.error.message };
  if (!allowed.isAllowed) return { ok: true, value: null };

  const addr = await getAddress();
  if (addr.error) return { ok: false, error: addr.error.message };
  if (!addr.address) return { ok: true, value: null };

  return { ok: true, value: addr.address };
}

/**
 * Full connect flow: check installed → prompt allow → return address.
 */
export async function connectFreighter(): Promise<FreighterResult<string>> {
  const conn = await isConnected();
  if (conn.error) return { ok: false, error: conn.error.message };
  if (!conn.isConnected) {
    return {
      ok: false,
      error: "Freighter extension not installed. Install from freighter.app",
    };
  }

  const allowed = await isAllowed();
  if (allowed.error) return { ok: false, error: allowed.error.message };

  if (!allowed.isAllowed) {
    const granted = await setAllowed();
    if (granted.error) return { ok: false, error: granted.error.message };
    if (!granted.isAllowed) {
      return { ok: false, error: "Connection rejected by user" };
    }
  }

  const addr = await getAddress();
  if (addr.error) return { ok: false, error: addr.error.message };
  if (!addr.address) {
    return { ok: false, error: "No address returned from Freighter" };
  }

  return { ok: true, value: addr.address };
}

/**
 * Sign a full transaction XDR via Freighter.
 * Used for raw Stellar transactions (e.g. the Phase 1 XLM test form).
 */
export async function signTxWithFreighter(
  unsignedXdr: string,
  signerAddress: string,
): Promise<FreighterResult<string>> {
  const signed = await signTransaction(unsignedXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: signerAddress,
  });
  if (signed.error) return { ok: false, error: signed.error.message };
  return { ok: true, value: signed.signedTxXdr };
}

export { createFreighterSigner } from "./signer";
