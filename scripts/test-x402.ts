/**
 * Phase 2 end-to-end x402 test script.
 *
 * Derives a Stellar keypair from a BIP-39 mnemonic (Freighter-compatible),
 * signs a payment via @x402/stellar, and calls the protected tip endpoint.
 *
 * Usage:
 *   1. Add to .env.local:
 *        TEST_MNEMONIC="your 12/24 word recovery phrase"
 *        TEST_ACCOUNT_INDEX=1         # 0 = first Freighter account, 1 = second, ...
 *        TEST_URL=http://localhost:3000/api/tip/test
 *   2. Run:
 *        pnpm tsx scripts/test-x402.ts
 *
 * Security: .env.local is gitignored. Never commit the mnemonic.
 */

import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { config as loadDotenv } from "dotenv";
import { deriveKeypairFromMnemonic } from "../src/lib/hd-wallet";

// Load .env.local (Next.js convention)
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

async function main() {
  const mnemonic = process.env.TEST_MNEMONIC;
  if (!mnemonic) {
    console.error("✗ Missing TEST_MNEMONIC in .env.local");
    console.error("  Add your Freighter recovery phrase to .env.local");
    process.exit(1);
  }

  const accountIndex = Number.parseInt(
    process.env.TEST_ACCOUNT_INDEX ?? "1",
    10,
  );

  const url = process.env.TEST_URL ?? "http://localhost:3000/api/tip/alice";

  const keypair = await deriveKeypairFromMnemonic(mnemonic, accountIndex);

  console.log("=== Phase 2 x402 test ===");
  console.log(`Account index : ${accountIndex}`);
  console.log(`Public key    : ${keypair.publicKey()}`);
  console.log(`Target URL    : ${url}`);
  console.log();

  // Build x402 client with Stellar scheme
  const signer = createEd25519Signer(keypair.secret(), "stellar:testnet");
  const client = new x402Client().register(
    "stellar:*",
    new ExactStellarScheme(signer),
  );

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log("→ Making request (expecting 402 → auto-pay → 200)...");
  const response = await fetchWithPayment(url, { method: "POST" });

  console.log();
  console.log(`Status        : ${response.status}`);
  console.log(
    `x-payment-response: ${response.headers.get("x-payment-response") ?? "(none)"}`,
  );
  const text = await response.text();
  console.log(`Body          : ${text}`);

  if (response.ok) {
    console.log();
    console.log("✓ SUCCESS — x402 payment flow works end-to-end!");
  } else {
    console.log();
    console.log("✗ FAILED — request did not return 200");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error();
  console.error("✗ Test failed:", err);
  process.exit(1);
});
