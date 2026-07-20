import { NextResponse } from "next/server";

/**
 * Tiny HTTP response helpers for Next.js API routes.
 *
 * Every route handler was repeating the same JSON response shapes for
 * errors. These helpers make handlers shorter and force a consistent
 * error body: `{ error: string }`.
 */

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

export function unauthorized(error = "Unauthorized"): NextResponse {
  return NextResponse.json({ error }, { status: 401 });
}

export function forbidden(error = "Forbidden"): NextResponse {
  return NextResponse.json({ error }, { status: 403 });
}

export function notFound(error = "Not found"): NextResponse {
  return NextResponse.json({ error }, { status: 404 });
}

export function conflict(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 409 });
}

export function serverError(error = "Internal server error"): NextResponse {
  return NextResponse.json({ error }, { status: 500 });
}

/**
 * Parse a JSON request body, returning null on failure.
 * Use this to avoid the try/catch boilerplate in every route:
 *
 *   const body = await parseJsonBody<MyType>(request);
 *   if (!body) return badRequest("Invalid JSON body");
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
): Promise<T | null> {
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      return parsed as T;
    }
    return null;
  } catch {
    return null;
  }
}
