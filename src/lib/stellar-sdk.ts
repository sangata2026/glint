/**
 * Stellar chain access for the Freighter wallet panel (TESTNET only).
 *
 * Self-contained helpers built directly on `@stellar/stellar-sdk` (v14):
 * fetch balances, build an unsigned XLM payment XDR, and submit a signed XDR.
 * Kept independent of the app's other stellar helpers so the Level 1 wallet
 * flow reads top-to-bottom in one place.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  HORIZON_TESTNET_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "./stellar-wallet";

/** Singleton Horizon testnet server (all methods are stateless). */
let _server: Horizon.Server | null = null;
function server(): Horizon.Server {
  if (!_server) _server = new Horizon.Server(HORIZON_TESTNET_URL);
  return _server;
}

/**
 * Fetch the native (XLM) balance for an address from Horizon testnet.
 * Returns a 7-decimal string, e.g. `"12.5000000"`.
 *
 * Unfunded accounts (Horizon 404) resolve to `"0"` rather than throwing, so
 * the UI can show "0 XLM (account not funded)".
 *
 * @throws on network/Horizon errors other than 404.
 */
export async function fetchXlmBalance(address: string): Promise<string> {
  try {
    const account = await server().loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 404) return "0";
    throw err;
  }
}

/**
 * Build an unsigned XLM payment transaction and return its XDR.
 * The caller signs it via Freighter and submits with {@link submitSignedTx}.
 *
 * @param from   source G-address (must be funded)
 * @param to     destination G-address
 * @param amount XLM amount as a decimal string, e.g. "1.5"
 */
export async function buildPaymentXdr(
  from: string,
  to: string,
  amount: string,
): Promise<string> {
  const source = await server().loadAccount(from);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: to,
        asset: Asset.native(),
        amount,
      }),
    )
    .setTimeout(30)
    .build();

  return tx.toXDR();
}

/**
 * Submit a Freighter-signed XDR to Horizon testnet.
 * Returns the confirmed transaction hash.
 *
 * @throws the underlying Horizon error (with `result_codes` when available) on
 *         a failed submission — callers surface `.message` to the user.
 */
export async function submitSignedTx(
  signedXdr: string,
): Promise<{ hash: string }> {
  const tx = TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
  const result = await server().submitTransaction(tx);
  return { hash: result.hash };
}
