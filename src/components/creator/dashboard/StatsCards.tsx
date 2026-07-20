"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { API_ENDPOINTS, ApiError, apiClient } from "@/lib/api";
import { shortenAddress, stroopsToUsdc } from "@/lib/stellar";

type RawMessage = {
  from: string;
  amount: string;
  note: string;
  timestamp: string;
};

type Stats = {
  total: string;
  count: number;
  supporters: number;
  biggest: { amount: string; from: string } | null;
};

type State =
  | { kind: "loading" }
  | { kind: "loaded"; stats: Stats }
  | { kind: "error"; message: string };

/**
 * Four stat tiles summarising a creator's tipping activity:
 *   - Total received (USDC)
 *   - Tip count
 *   - Unique supporters
 *   - Biggest single tip
 *
 * Aggregates client-side from /api/tip-messages — fine at current scale
 * (one creator = at most a few hundred on-chain messages). Swap to a
 * server-side endpoint once the wall grows.
 */
export function StatsCards({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await apiClient.get<{ messages: RawMessage[] }>(
          API_ENDPOINTS.tipMessages(slug),
        );
        if (cancelled) return;
        setState({ kind: "loaded", stats: aggregate(data.messages ?? []) });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : ((err as Error).message ?? "Failed to load stats");
        setState({ kind: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="md">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <Card padding="md">
        <p className="text-sm text-[var(--color-error)]">{state.message}</p>
      </Card>
    );
  }

  const { stats } = state;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatTile label="Total received" value={`$${stats.total}`} unit="USDC" />
      <StatTile label="Tips received" value={String(stats.count)} />
      <StatTile label="Supporters" value={String(stats.supporters)} />
      <StatTile
        label="Biggest tip"
        value={stats.biggest ? `$${stats.biggest.amount}` : "—"}
        sub={
          stats.biggest
            ? `from ${shortenAddress(stats.biggest.from, 4, 4)}`
            : undefined
        }
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">
        {label}
      </p>
      <p className="font-display text-3xl text-[var(--color-ink)] leading-none">
        {value}
        {unit && (
          <span className="ml-1 text-sm text-[var(--color-ink-muted)] font-sans">
            {unit}
          </span>
        )}
      </p>
      {sub && (
        <p className="text-xs text-[var(--color-ink-muted)] font-mono mt-2">
          {sub}
        </p>
      )}
    </Card>
  );
}

function aggregate(messages: RawMessage[]): Stats {
  let totalStroops = BigInt(0);
  const supporters = new Set<string>();
  let biggestStroops = BigInt(0);
  let biggestFrom = "";

  for (const m of messages) {
    const amt = BigInt(m.amount);
    totalStroops += amt;
    supporters.add(m.from);
    if (amt > biggestStroops) {
      biggestStroops = amt;
      biggestFrom = m.from;
    }
  }

  return {
    total: stroopsToUsdc(totalStroops.toString()),
    count: messages.length,
    supporters: supporters.size,
    biggest:
      biggestStroops > BigInt(0)
        ? {
            amount: stroopsToUsdc(biggestStroops.toString()),
            from: biggestFrom,
          }
        : null,
  };
}
