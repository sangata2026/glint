import { resolve } from "node:path";
import { FirestoreCreatorsStore } from "./firestore-store";
import { JSONFileStore } from "./json-file-store";
import type { CreatorsStore } from "./types";

/**
 * Returns the active creators store singleton.
 *
 * `STORE_TYPE=firestore` selects the Firestore backend (for hosted, multi-
 * instance deployments). Any other value (including unset) falls back to a local JSON file at
 * `CREATORS_STORE_PATH` — fine for dev, unsafe on ephemeral serverless disks.
 */
let _store: CreatorsStore | null = null;

export function getCreatorsStore(): CreatorsStore {
  if (_store) return _store;

  if (process.env.STORE_TYPE === "firestore") {
    _store = new FirestoreCreatorsStore();
  } else {
    const storePath = resolve(
      process.env.CREATORS_STORE_PATH ?? ".data/creators.json",
    );
    _store = new JSONFileStore(storePath);
  }

  return _store;
}

export {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  GITHUB_HANDLE_MAX,
  TWITTER_HANDLE_MAX,
  WEBSITE_URL_MAX,
} from "./limits";
export { validateSlug } from "./slug";
export * from "./types";
export {
  validateBio,
  validateDisplayName,
  validateGithub,
  validateTwitter,
  validateWebsite,
} from "./validate-profile";
