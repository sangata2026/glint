/**
 * Freighter wallet integration (Stellar TESTNET only).
 *
 * Thin, self-contained wrapper around `@stellar/freighter-api` (v6) exposing
 * the four operations the wallet UI needs: detect, connect, read address, sign.
 * Every function here targets Stellar testnet — see the exported constants.
 *
 * Freighter v6 returns `{ ...data, error? }` objects instead of throwing, so we
 * translate those into thrown `Error`s (or booleans) for straightforward
 * `try/catch` usage in the hook/UI layers.
 */
import {
  getAddress,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

/** SDF testnet network passphrase — every signed tx must use this. */
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/** Horizon testnet REST endpoint. */
export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

/**
 * Detect whether the Freighter browser extension is installed and reachable.
 * Uses `isConnected()`. Never throws — returns `false` on any error.
 */
export async function detectFreighter(): Promise<boolean> {
  try {
    const result = await isConnected();
    if (result.error) return false;
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connect the wallet: ensure access is granted (prompting the user if needed)
 * and return the active public key (G-address).
 *
 * Flow: `isAllowed()` → if not allowed, `requestAccess()` (shows the Freighter
 * approval popup) → `getAddress()`.
 *
 * @throws if Freighter errors, the user rejects, or no address is returned.
 */
export async function connectWallet(): Promise<string> {
  const allowed = await isAllowed();
  if (allowed.error) throw new Error(allowed.error.message);

  if (!allowed.isAllowed) {
    const access = await requestAccess();
    if (access.error) throw new Error(access.error.message);
    if (!access.address) throw new Error("Connection rejected in Freighter");
    return access.address;
  }

  const addr = await getAddress();
  if (addr.error) throw new Error(addr.error.message);
  if (!addr.address) throw new Error("No address returned from Freighter");
  return addr.address;
}

/**
 * Read the currently authorized wallet address without prompting.
 * Returns `null` when the dApp has not been granted access yet (silent path,
 * used for auto-reconnect on mount).
 *
 * @throws only on unexpected Freighter errors, not on "not connected".
 */
export async function getWalletAddress(): Promise<string | null> {
  const allowed = await isAllowed();
  if (allowed.error) throw new Error(allowed.error.message);
  if (!allowed.isAllowed) return null;

  const addr = await getAddress();
  if (addr.error) throw new Error(addr.error.message);
  return addr.address || null;
}

/**
 * Sign a transaction XDR with Freighter on the testnet network.
 * Returns the signed XDR ready for Horizon submission.
 *
 * @throws if the user declines or Freighter reports an error.
 */
export async function signTx(xdr: string): Promise<string> {
  const signed = await signTransaction(xdr, {
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  });
  if (signed.error) throw new Error(signed.error.message);
  return signed.signedTxXdr;
}
