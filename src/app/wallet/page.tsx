"use client";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { StellarWalletPanel } from "@/components/wallet/stellar-wallet-panel";

/**
 * /wallet — dedicated demo route for the Freighter integration.
 * Renders the full detect → connect → balance → send → tx-hash flow inside the
 * standard glint page shell (shared header + warm-paper background).
 */
export default function WalletPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 py-16">
          <div className="mb-8 max-w-xl">
            <h1 className="font-display text-4xl leading-tight mb-3">
              Stellar Wallet — Freighter Integration
            </h1>
            <p className="text-[var(--color-ink-soft)]">
              Connect Freighter on Stellar testnet, check your XLM balance, and
              send a payment end-to-end. Every transaction links out to Stellar
              Expert.
            </p>
          </div>

          <StellarWalletPanel />
        </section>
      </main>
    </div>
  );
}
