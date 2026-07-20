import { PageShell } from "@/components/layout/PageShell";
import { SendXlmForm } from "@/components/wallet/SendXlmForm";
import { WalletBalances } from "@/components/wallet/WalletBalances";

/**
 * Wallet connection test page (Phase 1 verification).
 * Kept around for dev debugging. Remove once Phase 4+ are stable.
 */
export default function TestPage() {
  return (
    <PageShell maxWidth="3xl">
      <h1 className="font-display text-4xl mb-2">Test page</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-8">
        Stellar wallet test page (Phase 1 dev)
      </p>

      <div className="space-y-6">
        <WalletBalances />
        <SendXlmForm />
      </div>

      <footer className="mt-16 pt-6 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-ink-muted)]">
          Network: Stellar Testnet. Install{" "}
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Freighter
          </a>{" "}
          and fund your account via{" "}
          <a
            href="https://friendbot.stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Friendbot
          </a>
          .
        </p>
      </footer>
    </PageShell>
  );
}
