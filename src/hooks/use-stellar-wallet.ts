"use client";

/**
 * useWallet — self-contained Freighter wallet hook for the Level 1 panel.
 *
 * Manages connection, testnet XLM balance, and sending XLM end-to-end
 * (build → sign → submit). Independent of the app-wide zustand wallet store so
 * the `/wallet` demo route stands on its own.
 */
import { useCallback, useState } from "react";
import {
  buildPaymentXdr,
  fetchXlmBalance,
  submitSignedTx,
} from "@/lib/stellar-sdk";
import { connectWallet, getWalletAddress, signTx } from "@/lib/stellar-wallet";

export type WalletState = {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
};

export type UseWallet = WalletState & {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  sendXlm: (to: string, amount: string) => Promise<{ hash: string }>;
};

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function useWallet(): UseWallet {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async (addr: string) => {
    const bal = await fetchXlmBalance(addr);
    setBalance(bal);
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      await loadBalance(addr);
    } catch (err) {
      setError(messageOf(err));
      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    const addr = address ?? (await getWalletAddress());
    if (!addr) return;
    setIsLoading(true);
    setError(null);
    try {
      await loadBalance(addr);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [address, loadBalance]);

  const sendXlm = useCallback(
    async (to: string, amount: string): Promise<{ hash: string }> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);
      try {
        const xdr = await buildPaymentXdr(address, to, amount);
        const signedXdr = await signTx(xdr);
        const result = await submitSignedTx(signedXdr);
        await loadBalance(address);
        return result;
      } catch (err) {
        const message = messageOf(err);
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [address, loadBalance],
  );

  return {
    address,
    balance,
    isConnected: address !== null,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
