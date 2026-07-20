import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

/**
 * Stellar classic account address (G...) validation.
 * 56 characters total: 'G' + 55 uppercase alphanumerics.
 */
const STELLAR_G_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Returns true if the input is a syntactically valid Stellar classic
 * public key (G-address). Does not verify the address exists on-chain.
 */
export function isValidStellarAddress(address: unknown): address is string {
  return typeof address === "string" && STELLAR_G_ADDRESS_REGEX.test(address);
}

/**
 * Shorten a Stellar address for display: keep `prefix` characters at the
 * start, `suffix` characters at the end, and replace the middle with `...`.
 *
 * Returns the original string unchanged if it's too short to shorten.
 *
 * @example
 *   shortenAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")  // "GABC...7890"
 *   shortenAddress("GABCDE...", 6, 6)                        // "GABCDE...890"
 */
export function shortenAddress(
  address: string | null | undefined,
  prefix = 4,
  suffix = 4,
): string {
  if (!address) return "";
  if (address.length <= prefix + suffix + 3) return address;
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`;
}

/**
 * Stellar network configuration for Glint.
 * Currently testnet-only. Can be made configurable in a later phase.
 */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

/**
 * Build a Stellar Expert deep link for a transaction hash.
 * Testnet-only for the POC; switch `testnet` → `public` for mainnet.
 */
export function stellarExpertTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

/**
 * USDC classic asset issuer on Stellar testnet.
 * Source: Circle official docs
 * https://www.circle.com/en/multi-chain-usdc/stellar
 */
export const USDC_ASSET_CODE = "USDC";
export const USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const USDC_ASSET = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

/**
 * USDC on Stellar has 7 decimal places (matches native stroop precision).
 * 1 USDC = 10^7 smallest units.
 */
export const USDC_DECIMALS = 7;
const USDC_UNIT = 10 ** USDC_DECIMALS;

/**
 * Convert a decimal USDC amount (e.g. "0.50" or 0.5) into stroops (bigint).
 * Truncates to 7 decimal places — anything beyond is discarded.
 *
 * @example
 *   usdcToStroops("0.50")  // 5000000n
 *   usdcToStroops(1.25)    // 12500000n
 */
export function usdcToStroops(decimal: string | number): bigint {
  const num =
    typeof decimal === "string" ? Number.parseFloat(decimal) : decimal;
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid USDC amount: ${decimal}`);
  }
  return BigInt(Math.round(num * USDC_UNIT));
}

/**
 * Convert stroops (bigint or string) to a human-readable decimal USDC string.
 * Trailing zeros are trimmed.
 *
 * @example
 *   stroopsToUsdc(5000000n)   // "0.5"
 *   stroopsToUsdc("12500000") // "1.25"
 *   stroopsToUsdc(0n)         // "0"
 */
export function stroopsToUsdc(stroops: bigint | string): string {
  const big = typeof stroops === "string" ? BigInt(stroops) : stroops;
  const divisor = BigInt(USDC_UNIT);
  const whole = big / divisor;
  const frac = big % divisor;
  const fracStr = frac
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString();
}

/**
 * Singleton Horizon server instance.
 * Safe to reuse across the app — all methods are stateless.
 */
let _server: Horizon.Server | null = null;
export function getServer(): Horizon.Server {
  if (!_server) {
    _server = new Horizon.Server(HORIZON_URL);
  }
  return _server;
}

/**
 * Extract XLM and USDC balances from a loaded account.
 * Returns null for balances that don't exist (no trustline, no native balance).
 */
export type AccountBalances = {
  xlm: string | null;
  usdc: string | null;
  hasUsdcTrustline: boolean;
};

export function parseBalances(
  account: Horizon.AccountResponse,
): AccountBalances {
  let xlm: string | null = null;
  let usdc: string | null = null;
  let hasUsdcTrustline = false;

  for (const balance of account.balances) {
    if (balance.asset_type === "native") {
      xlm = balance.balance;
    } else if (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    ) {
      usdc = balance.balance;
      hasUsdcTrustline = true;
    }
  }

  return { xlm, usdc, hasUsdcTrustline };
}

/**
 * Load account balances for an address.
 * Returns zero balances if the account hasn't been funded yet (404 from Horizon).
 */
export async function loadBalances(address: string): Promise<AccountBalances> {
  try {
    const account = await getServer().loadAccount(address);
    return parseBalances(account);
  } catch (err) {
    // Horizon returns 404 for unfunded accounts
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 404) {
      return { xlm: "0", usdc: null, hasUsdcTrustline: false };
    }
    throw err;
  }
}

/**
 * Build an unsigned payment transaction (XLM).
 * Caller is responsible for signing and submitting via Freighter + Horizon.
 */
export async function buildXlmPaymentTx(
  sourceAddress: string,
  destination: string,
  amount: string,
): Promise<string> {
  const server = getServer();
  const source = await server.loadAccount(sourceAddress);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      }),
    )
    .setTimeout(180)
    .build();

  return tx.toXDR();
}

/**
 * Submit a signed transaction XDR to Horizon.
 * Returns the transaction hash on success.
 */
export async function submitSignedTx(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await getServer().submitTransaction(tx);
  return result.hash;
}
