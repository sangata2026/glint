/**
 * Print the server wallet address derived from TEST_MNEMONIC + SERVER_ACCOUNT_INDEX.
 * Use this to verify + fund the account before running deploy-tipjar.ts.
 *
 * Usage:
 *   pnpm tsx scripts/show-server-address.ts
 */

import { config as loadDotenv } from "dotenv";
import { deriveKeypairFromMnemonic } from "../src/lib/hd-wallet";

loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

async function main() {
  const mnemonic = process.env.TEST_MNEMONIC;
  if (!mnemonic) {
    console.error("✗ Missing TEST_MNEMONIC in .env.local");
    process.exit(1);
  }

  const accountIndex = Number.parseInt(
    process.env.SERVER_ACCOUNT_INDEX ?? "2",
    10,
  );
  const kp = await deriveKeypairFromMnemonic(mnemonic, accountIndex);

  console.log(`Account index : ${accountIndex}`);
  console.log(`Public key    : ${kp.publicKey()}`);
  console.log();
  console.log("Fund this account on testnet:");
  console.log(`  https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
