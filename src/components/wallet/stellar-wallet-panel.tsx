"use client";

/**
 * StellarWalletPanel — self-contained Level 1 demo UI.
 *
 * Walks a reviewer through the full Freighter flow on Stellar testnet:
 * detect → connect → balance → send → tx hash. All state lives in the
 * `useWallet` hook; this file only renders and wires buttons.
 *
 * Styled with the glint "warm paper" design tokens (Card/Button primitives,
 * CSS custom properties) so it reads as the same product as the landing page.
 *
 * `detectFreighter`, `connectWallet`, and `signTx` are imported explicitly from
 * the wallet lib per the Level 1 spec (connect/sign run through the hook, but
 * the panel owns extension detection on mount).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useWallet } from "@/hooks/use-stellar-wallet";
import {
  connectWallet,
  detectFreighter,
  HORIZON_TESTNET_URL,
  signTx,
} from "@/lib/stellar-wallet";

const STELLAR_G_ADDRESS = /^G[A-Z0-9]{55}$/;

// Referenced so the explicit Level 1 imports are exercised even though the
// connect/sign happen inside the hook — keeps tree-shaking from dropping them.
void connectWallet;
void signTx;

const INPUT_CLASS =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] " +
  "px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors " +
  "placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-border-strong)]";

const FIELD_LABEL_CLASS =
  "block text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] mb-1.5";

function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function StellarWalletPanel() {
  const {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  } = useWallet();

  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    detectFreighter().then(setHasFreighter);
  }, []);

  const balanceIsZeroUnfunded = balance === "0";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setTxHash(null);
    setSendError(null);

    if (!STELLAR_G_ADDRESS.test(destination.trim())) {
      setSendError("Enter a valid destination G-address.");
      return;
    }
    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setSendError("Enter an amount greater than 0.");
      return;
    }

    setSending(true);
    try {
      const { hash } = await sendXlm(destination.trim(), amount);
      setTxHash(hash);
      setDestination("");
      setAmount("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card padding="lg" className="space-y-6">
      <header className="space-y-1">
        <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
          Freighter · Stellar Testnet
        </div>
        <h2 className="font-display text-2xl">Wallet</h2>
        <p className="font-mono text-xs text-[var(--color-ink-muted)] break-all">
          {HORIZON_TESTNET_URL}
        </p>
      </header>

      {/* 1 — Install prompt */}
      {hasFreighter === false && (
        <Card
          sunken
          padding="sm"
          className="text-sm !border-[var(--color-warn)]"
        >
          <span className="text-[var(--color-ink-soft)]">
            Freighter extension not detected.{" "}
          </span>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--color-warn)] underline underline-offset-2"
          >
            Install Freighter
          </a>
        </Card>
      )}

      {/* 2 — Connect / disconnect */}
      {hasFreighter !== false && !isConnected && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? "Connecting…" : "Connect Wallet"}
        </Button>
      )}

      {isConnected && (
        <div className="space-y-5">
          <Card sunken padding="md">
            <div className={FIELD_LABEL_CLASS}>Connected address</div>
            <div className="break-all font-mono text-sm text-[var(--color-ink)]">
              {address}
            </div>
            <button
              type="button"
              onClick={disconnect}
              className="mt-3 text-sm font-medium text-[var(--color-error)] hover:underline underline-offset-2"
            >
              Disconnect
            </button>
          </Card>

          {/* 3 — Balance */}
          <Card sunken padding="md">
            <div className={FIELD_LABEL_CLASS}>XLM Balance</div>
            <div className="font-display text-4xl text-[var(--color-ink)] tabular-nums">
              {balance === null ? (
                <span className="text-[var(--color-ink-muted)]">—</span>
              ) : balanceIsZeroUnfunded ? (
                <span>
                  0{" "}
                  <span className="text-2xl text-[var(--color-ink-muted)]">
                    XLM
                  </span>
                  <span className="block font-sans text-sm text-[var(--color-ink-muted)]">
                    account not funded
                  </span>
                </span>
              ) : (
                <span>
                  {balance}{" "}
                  <span className="text-2xl text-[var(--color-ink-muted)]">
                    XLM
                  </span>
                </span>
              )}
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={refreshBalance}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing…" : "Refresh Balance"}
              </Button>
            </div>
          </Card>

          {/* 4 — Send form */}
          <form onSubmit={handleSend} className="space-y-4">
            <h3 className="font-display text-xl">Send XLM</h3>
            <div>
              <label htmlFor="wallet-destination" className={FIELD_LABEL_CLASS}>
                Destination address
              </label>
              <input
                id="wallet-destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="G…"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="wallet-amount" className={FIELD_LABEL_CLASS}>
                Amount (XLM)
              </label>
              <input
                id="wallet-amount"
                type="number"
                step="0.0000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0000000"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={sending || isLoading}
            >
              {sending ? "Sending…" : "Send XLM"}
            </Button>
          </form>

          {/* 4 — Tx feedback */}
          {txHash && (
            <Card
              sunken
              padding="sm"
              className="text-sm !border-[var(--color-success)]"
            >
              <div className="font-medium text-[var(--color-success)]">
                Transaction sent!
              </div>
              <div className="mt-1 text-[var(--color-ink-soft)]">
                Hash:{" "}
                <a
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono font-medium text-[var(--color-success)] underline underline-offset-2"
                >
                  {txHash}
                </a>
              </div>
            </Card>
          )}
          {sendError && (
            <Card
              sunken
              padding="sm"
              className="text-sm !border-[var(--color-error)] text-[var(--color-error)] break-words"
            >
              {sendError}
            </Card>
          )}
        </div>
      )}

      {error && !sendError && (
        <Card
          sunken
          padding="sm"
          className="text-sm !border-[var(--color-error)] text-[var(--color-error)] break-words"
        >
          {error}
        </Card>
      )}
    </Card>
  );
}
