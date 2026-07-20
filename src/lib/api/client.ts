import axios, { type AxiosError, type AxiosInstance } from "axios";

/**
 * Shared Axios instance for calling Glint's own API routes.
 *
 * Rules of the road:
 *   - Use `apiClient` for Glint's `/api/*` endpoints only
 *   - DO NOT use for x402 tip payment — `@x402/fetch` wraps native fetch and
 *     must stay on fetch
 *   - DO NOT use for Stellar SDK calls (Horizon, Soroban RPC) — the SDK has
 *     its own HTTP layer
 *
 * The instance is configured with:
 *   - No baseURL (uses relative paths, works in SSR + browser)
 *   - JSON content type
 *   - An interceptor that normalizes errors into a consistent shape so
 *     callers can use `error.message` without worrying about axios internals
 */

/** Shape of error from our API routes. Matches `lib/api-helpers.ts`. */
type ApiErrorBody = { error?: string };

/**
 * Normalized API error. Thrown by the axios interceptor on any non-2xx
 * response or network failure.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function createClient(): AxiosInstance {
  const client = axios.create({
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // Let 4xx/5xx throw so we can normalize in the interceptor
    validateStatus: (status) => status >= 200 && status < 300,
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorBody>) => {
      // Network error or no response
      if (!error.response) {
        return Promise.reject(
          new ApiError(error.message ?? "Network error", 0),
        );
      }

      const { status, data } = error.response;
      const message =
        data?.error ?? error.message ?? `Request failed with status ${status}`;

      return Promise.reject(new ApiError(message, status));
    },
  );

  return client;
}

export const apiClient = createClient();
