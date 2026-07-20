"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/stores/wallet";

/**
 * On mount, silently check if Freighter already approved this dApp.
 * If yes, restore the wallet session without a popup.
 *
 * This lives in a client-only component so it doesn't run on the server
 * and cause hydration mismatches.
 */
export function AutoReconnect() {
  const autoReconnect = useWalletStore((s) => s.autoReconnect);

  useEffect(() => {
    autoReconnect();
  }, [autoReconnect]);

  return null;
}
