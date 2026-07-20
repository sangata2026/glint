import {
  signAuthEntry as freighterSignAuthEntry,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import type { ClientStellarSigner } from "@x402/stellar";

/**
 * Wrap Freighter browser extension APIs into a `ClientStellarSigner`.
 *
 * `@x402/stellar` expects a signer implementing SEP-43 (`signAuthEntry`
 * required, `signTransaction` optional). Freighter v6 exposes both but uses
 * slightly different return shapes — we normalize here.
 *
 * Unlike the rest of `lib/freighter/`, this adapter **throws** on error
 * instead of returning a tagged union because it implements the external
 * `ClientStellarSigner` contract from `@x402/stellar`, which doesn't allow
 * return-based error handling.
 *
 * Usage:
 *   const signer = createFreighterSigner(address);
 *   const client = new x402Client().register(
 *     "stellar:*",
 *     new ExactStellarScheme(signer),
 *   );
 */
export function createFreighterSigner(address: string): ClientStellarSigner {
  return {
    address,

    async signAuthEntry(authEntryXdr, opts) {
      const result = await freighterSignAuthEntry(authEntryXdr, {
        networkPassphrase: opts?.networkPassphrase,
        address: opts?.address ?? address,
      });

      if (result.error) {
        throw new Error(`Freighter: ${result.error.message}`);
      }
      if (result.signedAuthEntry === null) {
        throw new Error("Freighter: user cancelled signing");
      }

      return {
        signedAuthEntry: result.signedAuthEntry,
        signerAddress: result.signerAddress ?? address,
      };
    },

    async signTransaction(xdr, opts) {
      const result = await freighterSignTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase,
        address: opts?.address ?? address,
      });

      if (result.error) {
        throw new Error(`Freighter: ${result.error.message}`);
      }

      return {
        signedTxXdr: result.signedTxXdr,
        signerAddress: result.signerAddress ?? address,
      };
    },
  };
}
