import type { HTTPAdapter } from "@x402/core/server";

/**
 * Adapter that bridges a Next.js `Request` to the framework-agnostic
 * `HTTPAdapter` interface expected by `@x402/core`.
 *
 * The underlying x402 resource server uses this to read headers, method,
 * path, etc. without being tied to any specific HTTP framework.
 */
export class NextHTTPAdapter implements HTTPAdapter {
  private readonly url: URL;
  private readonly body: unknown;

  constructor(
    private readonly request: Request,
    body: unknown = undefined,
  ) {
    this.url = new URL(request.url);
    this.body = body;
  }

  getHeader(name: string): string | undefined {
    return this.request.headers.get(name) ?? undefined;
  }

  getMethod(): string {
    return this.request.method;
  }

  getPath(): string {
    return this.url.pathname;
  }

  getUrl(): string {
    return this.request.url;
  }

  getAcceptHeader(): string {
    return this.request.headers.get("accept") ?? "*/*";
  }

  getUserAgent(): string {
    return this.request.headers.get("user-agent") ?? "";
  }

  getQueryParams(): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};
    for (const [key, value] of this.url.searchParams.entries()) {
      const existing = params[key];
      if (existing === undefined) {
        params[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        params[key] = [existing, value];
      }
    }
    return params;
  }

  getQueryParam(name: string): string | string[] | undefined {
    const values = this.url.searchParams.getAll(name);
    if (values.length === 0) return undefined;
    if (values.length === 1) return values[0];
    return values;
  }

  getBody(): unknown {
    return this.body;
  }
}
