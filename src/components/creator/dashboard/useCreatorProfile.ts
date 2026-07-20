"use client";

import { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS, ApiError, apiClient } from "@/lib/api";
import type { Creator } from "@/lib/creators/types";

export type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "no-profile" }
  | { kind: "loaded"; creator: Creator }
  | { kind: "error"; message: string };

/**
 * Custom hook that loads the current wallet's creator profile and
 * exposes an update callback.
 *
 * Returns:
 *   - state: the current load state (idle / loading / no-profile / loaded / error)
 *   - updateProfile: call with partial fields to PATCH the profile
 *
 * When `walletAddress` is null the hook returns the idle state and does nothing.
 * Changing `walletAddress` reloads the profile.
 */
export function useCreatorProfile(walletAddress: string | null) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  // Load profile whenever the connected wallet changes.
  useEffect(() => {
    if (!walletAddress) {
      setState({ kind: "idle" });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading" });

    (async () => {
      try {
        const { data: creator } = await apiClient.get<Creator>(
          API_ENDPOINTS.CREATOR_BY_WALLET,
          { params: { address: walletAddress } },
        );
        if (cancelled) return;
        setState({ kind: "loaded", creator });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: "no-profile" });
          return;
        }
        setState({
          kind: "error",
          message:
            err instanceof ApiError
              ? err.message
              : ((err as Error).message ?? "Network error"),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  /**
   * PATCH the profile. Returns the updated creator on success, or an error
   * string on failure. The hook's state is updated automatically on success.
   */
  const updateProfile = useCallback(
    async (
      slug: string,
      updates: {
        displayName: string;
        bio?: string;
        twitter?: string;
        github?: string;
        website?: string;
      },
    ): Promise<
      { ok: true; creator: Creator } | { ok: false; error: string }
    > => {
      if (!walletAddress) {
        return { ok: false, error: "Wallet not connected" };
      }
      try {
        const { data: creator } = await apiClient.patch<Creator>(
          API_ENDPOINTS.creatorBySlug(slug),
          {
            walletAddress,
            displayName: updates.displayName.trim(),
            bio: updates.bio?.trim() || undefined,
            twitter: updates.twitter?.trim() || undefined,
            github: updates.github?.trim() || undefined,
            website: updates.website?.trim() || undefined,
          },
        );
        setState({ kind: "loaded", creator });
        return { ok: true, creator };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof ApiError
              ? err.message
              : ((err as Error).message ?? "Network error"),
        };
      }
    },
    [walletAddress],
  );

  return { state, updateProfile };
}
