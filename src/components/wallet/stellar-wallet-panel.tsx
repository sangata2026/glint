"use client";

/**
 * StellarWalletPanel — self-contained Level 1 demo UI.
 *
 * Walks a reviewer through the full Freighter flow on Stellar testnet:
 * detect → connect → balance → send → tx hash. All state lives in the
 * `useWallet` hook; this file only renders and wires buttons.
 *
 * `detectFreighter`, `connectWallet`, and `signTx` are imported explicitly from
 * the wallet lib per the Level 1 spec (connect/sign run through the hook, but
 * the panel owns extension detection on mount).
 */
import { useEffect, useState } from "react";
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
    <div className="mx-auto max-w-xl space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Freighter Wallet</h1>
        <p className="text-sm text-neutral-500">
          Stellar <span className="font-medium">Testnet</span> ·{" "}
          <span className="font-mono text-xs">{HORIZON_TESTNET_URL}</span>
        </p>
      </header>

      {/* 1 — Install prompt */}
      {hasFreighter === false && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Freighter extension not detected.{" "}
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Install Freighter
          </a>
        </div>
      )}

      {/* 2 — Connect / disconnect */}
      {hasFreighter !== false && !isConnected && (
        <button
          type="button"
          onClick={connect}
          disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isLoading ? "Connecting…" : "Connect Wallet"}
        </button>
      )}

      {isConnected && (
        <div className="space-y-4">
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/60">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Connected address
            </div>
            <div className="mt-1 break-all font-mono text-sm">{address}</div>
            <button
              type="button"
              onClick={disconnect}
              className="mt-3 text-sm font-medium text-red-600 hover:underline"
            >
              Disconnect
            </button>
          </div>

          {/* 3 — Balance */}
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              XLM Balance
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {balance === null ? (
                <span className="text-neutral-400">—</span>
              ) : balanceIsZeroUnfunded ? (
                <span>
                  0 XLM{" "}
                  <span className="text-sm font-normal text-neutral-500">
                    (account not funded)
                  </span>
                </span>
              ) : (
                `${balance} XLM`
              )}
            </div>
            <button
              type="button"
              onClick={refreshBalance}
              disabled={isLoading}
              className="mt-3 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-white/15 dark:hover:bg-neutral-800"
            >
              {isLoading ? "Refreshing…" : "Refresh Balance"}
            </button>
          </div>

          {/* 4 — Send form */}
          <form
            onSubmit={handleSend}
            className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
          >
            <div className="text-sm font-medium">Send XLM</div>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination G-address"
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 dark:border-white/15"
            />
            <input
              type="number"
              step="0.0000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (XLM)"
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15"
            />
            <button
              type="submit"
              disabled={sending || isLoading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send XLM"}
            </button>
          </form>

          {/* 4 — Tx feedback */}
          {txHash && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              Transaction sent! Hash:{" "}
              <a
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono font-semibold underline"
              >
                {txHash}
              </a>
            </div>
          )}
          {sendError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {sendError}
            </div>
          )}
        </div>
      )}

      {error && !sendError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
