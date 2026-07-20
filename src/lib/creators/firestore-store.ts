import { Firestore } from "@google-cloud/firestore";
import {
  type CreateCreatorInput,
  type Creator,
  type CreatorsStore,
  type ListCreatorsOptions,
  type ListCreatorsResult,
  NotProfileOwnerError,
  SlugTakenError,
  type UpdateCreatorInput,
  WalletAlreadyHasProfileError,
} from "./types";

const COLLECTION = "creators";
const DEFAULT_LIST_LIMIT = 50;

// gRPC status code for ALREADY_EXISTS — thrown by transaction `.create()` when
// a document with the given ID is already present.
const GRPC_ALREADY_EXISTS = 6;

/**
 * Firestore-backed implementation of `CreatorsStore`.
 *
 * Suitable for serverless hosts: Application Default Credentials are picked up
 * automatically from the attached service account — no key file needed.
 * Collection is `creators`, document ID is the slug (natural unique key).
 */
export class FirestoreCreatorsStore implements CreatorsStore {
  private readonly db: Firestore;

  constructor() {
    this.db = new Firestore();
  }

  private collection() {
    return this.db.collection(COLLECTION);
  }

  async get(slug: string): Promise<Creator | null> {
    const snap = await this.collection().doc(slug).get();
    return snap.exists ? (snap.data() as Creator) : null;
  }

  async getByWallet(walletAddress: string): Promise<Creator | null> {
    const snap = await this.collection()
      .where("walletAddress", "==", walletAddress)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as Creator;
  }

  async create(input: CreateCreatorInput): Promise<Creator> {
    const now = new Date().toISOString();
    const creator: Creator = {
      slug: input.slug,
      walletAddress: input.walletAddress,
      displayName: input.displayName,
      bio: input.bio,
      twitter: input.twitter,
      github: input.github,
      website: input.website,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.collection().doc(input.slug);
    const walletQuery = this.collection()
      .where("walletAddress", "==", input.walletAddress)
      .limit(1);

    try {
      await this.db.runTransaction(async (tx) => {
        // Wallet uniqueness check must be inside the transaction so a concurrent
        // create can't slip a second profile under the same wallet.
        const existing = await tx.get(walletQuery);
        if (!existing.empty) {
          throw new WalletAlreadyHasProfileError(input.walletAddress);
        }
        // `tx.create` fails with ALREADY_EXISTS if the slug is already taken.
        tx.create(docRef, stripUndefined(creator));
      });
    } catch (err) {
      if (isAlreadyExists(err)) {
        throw new SlugTakenError(input.slug);
      }
      throw err;
    }

    return creator;
  }

  async update(
    slug: string,
    walletAddress: string,
    updates: UpdateCreatorInput,
  ): Promise<Creator> {
    const docRef = this.collection().doc(slug);

    return await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        throw new Error(`Creator with slug "${slug}" not found`);
      }

      const existing = snap.data() as Creator;
      if (existing.walletAddress !== walletAddress) {
        throw new NotProfileOwnerError();
      }

      const merged: Creator = {
        ...existing,
        ...(updates.displayName !== undefined && {
          displayName: updates.displayName,
        }),
        ...(updates.bio !== undefined && { bio: updates.bio }),
        ...(updates.twitter !== undefined && { twitter: updates.twitter }),
        ...(updates.github !== undefined && { github: updates.github }),
        ...(updates.website !== undefined && { website: updates.website }),
        updatedAt: new Date().toISOString(),
      };

      tx.set(docRef, stripUndefined(merged));
      return merged;
    });
  }

  async list(options: ListCreatorsOptions = {}): Promise<ListCreatorsResult> {
    const { search, limit = DEFAULT_LIST_LIMIT, offset = 0 } = options;

    if (search && search.trim().length > 0) {
      // Firestore has no native substring search — fetch ordered docs and
      // filter in memory. Fine at POC scale; revisit with an external index
      // (Algolia / Typesense) if the creator set grows past a few thousand.
      const all = await this.collection().orderBy("createdAt", "desc").get();
      const needle = search.trim().toLowerCase();
      const matches = all.docs
        .map((d) => d.data() as Creator)
        .filter(
          (c) =>
            c.slug.toLowerCase().includes(needle) ||
            c.displayName.toLowerCase().includes(needle),
        );
      return {
        creators: matches.slice(offset, offset + limit),
        total: matches.length,
      };
    }

    const [pageSnap, countSnap] = await Promise.all([
      this.collection()
        .orderBy("createdAt", "desc")
        .offset(offset)
        .limit(limit)
        .get(),
      this.collection().count().get(),
    ]);

    return {
      creators: pageSnap.docs.map((d) => d.data() as Creator),
      total: countSnap.data().count,
    };
  }
}

/**
 * Firestore rejects writes containing `undefined` values. Our domain type
 * uses optional fields, so strip them before persisting.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function isAlreadyExists(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === GRPC_ALREADY_EXISTS
  );
}
