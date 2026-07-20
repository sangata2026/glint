/**
 * Creator profile domain types and store interface.
 *
 * This module defines the shape of a creator profile and the contract
 * that every storage backend must implement. The current POC uses a
 * JSON file backend (`JSONFileStore`); production can swap in Firestore
 * or another DB without touching callers.
 */

export type Creator = {
  slug: string;
  walletAddress: string;
  displayName: string;
  bio?: string;
  /** Twitter / X handle, stored without leading `@`. */
  twitter?: string;
  /** GitHub username. */
  github?: string;
  /** Personal/website URL (http or https). */
  website?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCreatorInput = {
  slug: string;
  walletAddress: string;
  displayName: string;
  bio?: string;
  twitter?: string;
  github?: string;
  website?: string;
};

export type UpdateCreatorInput = {
  displayName?: string;
  bio?: string;
  twitter?: string;
  github?: string;
  website?: string;
};

/**
 * Error raised when a slug is already taken.
 */
export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
    this.name = "SlugTakenError";
  }
}

/**
 * Error raised when the caller doesn't own the profile they're editing.
 */
export class NotProfileOwnerError extends Error {
  constructor() {
    super("Only the profile owner can perform this action");
    this.name = "NotProfileOwnerError";
  }
}

/**
 * Error raised when a wallet address already has a profile.
 * A wallet can only own one profile at a time in the POC.
 */
export class WalletAlreadyHasProfileError extends Error {
  constructor(walletAddress: string) {
    const short =
      walletAddress.length > 12
        ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
        : walletAddress;
    super(`This wallet (${short}) already has a profile`);
    this.name = "WalletAlreadyHasProfileError";
  }
}

/**
 * Options for {@link CreatorsStore.list}.
 */
export type ListCreatorsOptions = {
  /** Case-insensitive substring match against `slug` and `displayName`. */
  search?: string;
  /** Maximum number of results to return. Default 50. */
  limit?: number;
  /** Number of results to skip (for pagination). Default 0. */
  offset?: number;
};

/**
 * Result of {@link CreatorsStore.list} — includes total count so clients can
 * know whether more pages exist.
 */
export type ListCreatorsResult = {
  creators: Creator[];
  total: number;
};

/**
 * Storage backend contract. All implementations must be async-safe.
 */
export interface CreatorsStore {
  /** Fetch a creator by URL slug. Returns null if not found. */
  get(slug: string): Promise<Creator | null>;

  /** Fetch a creator by wallet address. Returns null if not found. */
  getByWallet(walletAddress: string): Promise<Creator | null>;

  /**
   * Create a new creator profile.
   * @throws {SlugTakenError} if the slug is already taken
   * @throws {WalletAlreadyHasProfileError} if the wallet already has a profile
   */
  create(input: CreateCreatorInput): Promise<Creator>;

  /**
   * Update a creator profile. Only the owner (matching wallet address) can update.
   * @throws {NotProfileOwnerError} if walletAddress doesn't match
   */
  update(
    slug: string,
    walletAddress: string,
    updates: UpdateCreatorInput,
  ): Promise<Creator>;

  /**
   * List creators sorted newest-first. Supports substring search over
   * slug + displayName and basic pagination.
   */
  list(options?: ListCreatorsOptions): Promise<ListCreatorsResult>;
}
