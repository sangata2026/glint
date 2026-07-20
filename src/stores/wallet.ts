import { WatchWalletChanges } from "@stellar/freighter-api";
import { toast } from "sonner";
import { create } from "zustand";
import { checkPreviouslyAllowed, connectFreighter } from "@/lib/freighter";
import { loadBalances, shortenAddress } from "@/lib/stellar";

type WalletState = {
  // State
  address: string | null;
  xlmBalance: string | null;
  usdcBalance: string | null;
  hasUsdcTrustline: boolean;
  isConnecting: boolean;
  isLoadingBalances: boolean;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  autoReconnect: () => Promise<void>;
  clearError: () => void;
};

/**
 * Module-level watcher instance. Freighter's `WatchWalletChanges` polls the
 * extension every N ms and calls our callback when the active address or
 * network changes. We only want ONE watcher per process.
 */
let _watcher: WatchWalletChanges | null = null;

function startWatching(onAddressChange: (newAddress: string) => void) {
  if (_watcher) return;
  _watcher = new WatchWalletChanges(3000); // poll every 3s
  _watcher.watch((params) => {
    if (params.error) return;
    if (params.address) onAddressChange(params.address);
  });
}

function stopWatching() {
  if (_watcher) {
    _watcher.stop();
    _watcher = null;
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  xlmBalance: null,
  usdcBalance: null,
  hasUsdcTrustline: false,
  isConnecting: false,
  isLoadingBalances: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });
    const result = await connectFreighter();
    if (!result.ok) {
      set({ isConnecting: false, error: result.error, address: null });
      return;
    }
    set({ address: result.value, isConnecting: false });
    get().refreshBalances();
    startWatching(handleFreighterAddressChange);
  },

  disconnect: () => {
    stopWatching();
    set({
      address: null,
      xlmBalance: null,
      usdcBalance: null,
      hasUsdcTrustline: false,
      error: null,
    });
  },

  refreshBalances: async () => {
    const { address } = get();
    if (!address) return;
    set({ isLoadingBalances: true });
    try {
      const balances = await loadBalances(address);
      set({
        xlmBalance: balances.xlm,
        usdcBalance: balances.usdc,
        hasUsdcTrustline: balances.hasUsdcTrustline,
        isLoadingBalances: false,
      });
    } catch (err) {
      set({
        error: (err as Error).message,
        isLoadingBalances: false,
      });
    }
  },

  autoReconnect: async () => {
    const result = await checkPreviouslyAllowed();
    if (!result.ok || !result.value) return;
    set({ address: result.value });
    get().refreshBalances();
    startWatching(handleFreighterAddressChange);
  },

  clearError: () => set({ error: null }),
}));

/**
 * Called whenever Freighter reports a new active address.
 * Runs outside the store definition so it can reference `useWalletStore`
 * (avoids a chicken-and-egg init issue).
 */
function handleFreighterAddressChange(newAddress: string) {
  const { address: currentAddress } = useWalletStore.getState();
  if (newAddress === currentAddress) return;

  useWalletStore.setState({
    address: newAddress,
    xlmBalance: null,
    usdcBalance: null,
    hasUsdcTrustline: false,
  });
  useWalletStore.getState().refreshBalances();
  toast.info(`Switched to ${shortenAddress(newAddress)}`);
}
