"use client";

import { StellarWalletPanel } from "@/components/wallet/stellar-wallet-panel";

/**
 * /wallet — dedicated demo route for the Freighter integration.
 * Renders the full detect → connect → balance → send → tx-hash flow.
 */
export default function WalletPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-center text-2xl font-bold">
          Stellar Wallet — Freighter Integration
        </h1>
        <StellarWalletPanel />
      </div>
    </main>
  );
}
