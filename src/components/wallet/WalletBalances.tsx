"use client";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { shortenAddress } from "@/lib/stellar";
import { useWalletStore } from "@/stores/wallet";

export function WalletBalances() {
  const address = useWalletStore((s) => s.address);
  const xlmBalance = useWalletStore((s) => s.xlmBalance);
  const usdcBalance = useWalletStore((s) => s.usdcBalance);
  const hasUsdcTrustline = useWalletStore((s) => s.hasUsdcTrustline);
  const isLoadingBalances = useWalletStore((s) => s.isLoadingBalances);
  const refreshBalances = useWalletStore((s) => s.refreshBalances);

  if (!address) return null;

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl">Wallet</h2>
        <button
          type="button"
          onClick={refreshBalances}
          disabled={isLoadingBalances}
          className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline disabled:opacity-50"
        >
          {isLoadingBalances ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="mb-5">
        <div className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)] mb-2">
          Connected address
        </div>
        <div className="font-mono text-sm text-[var(--color-ink)] break-all">
          {shortenAddress(address, 8, 8)}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
        <BalanceRow
          label="XLM"
          value={xlmBalance}
          loading={isLoadingBalances && xlmBalance === null}
        />
        {hasUsdcTrustline ? (
          <BalanceRow
            label="USDC"
            value={usdcBalance ?? "0"}
            loading={isLoadingBalances && usdcBalance === null}
          />
        ) : (
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[var(--color-ink-soft)]">USDC</span>
            <span className="text-xs text-[var(--color-warn)]">
              No trustline
            </span>
          </div>
        )}
      </div>

      {!hasUsdcTrustline && xlmBalance !== null && xlmBalance !== "0" && (
        <p className="text-xs text-[var(--color-ink-muted)] pt-4 mt-4 border-t border-[var(--color-border)]">
          You need a USDC trustline to receive tips. Open Freighter → Manage
          Assets → Add USDC.
        </p>
      )}
    </Card>
  );
}

function BalanceRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-[var(--color-ink-soft)]">{label}</span>
      {loading ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <span className="font-mono text-[var(--color-ink)]">
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}
