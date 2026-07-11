import { NextResponse } from "next/server";

/**
 * Guards destructive/admin-only endpoints (e.g. full DB reset, bulk seed).
 *
 * Requires an `ADMIN_API_TOKEN` env var to be set and the caller to send it
 * back via the `x-admin-token` header. Without a configured token, the
 * endpoint is locked down entirely (fails closed) rather than left open.
 */
export function requireAdminToken(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "This endpoint is disabled. Set ADMIN_API_TOKEN to enable it." },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-admin-token");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * Parses a route param expected to be a positive integer id.
 * Returns null if invalid so callers can return a 400 instead of
 * silently querying with NaN.
 */
export function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
